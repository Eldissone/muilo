import express from 'express';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // ← Adicione esta importação
import { fileURLToPath } from 'url';

const router = express.Router();

// Obter __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user profile (Protected)
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Usar caminho absoluto para o diretório de uploads
        const uploadDir = path.join(__dirname, '../uploads/avatars/');
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = req.userId + '-' + uniqueSuffix + extension;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // Aceitar apenas imagens
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado. Apenas imagens são permitidas.'));
        }
    }
});

// Middleware para tratar erros do multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Arquivo muito grande. Tamanho máximo: 5MB' });
        }
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Rota para upload de avatar
router.patch('/:id/avatar', auth, upload.single('avatar'), handleMulterError, async (req, res) => {
    try {
        // Verificar se usuário tem permissão
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma imagem enviada' });
        }
        
        // Criar URL relativa para a imagem
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Primeiro verificar se usuário existe
        const user = await User.findById(req.params.id);
        if (!user) {
            // Deletar arquivo se usuário não existir
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Se usuário já tinha um avatar, deletar o arquivo antigo
        if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
            const oldAvatarPath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }
        
        // Atualizar usuário com nova URL do avatar
        user.avatar = avatarUrl;
        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({
            message: 'Avatar atualizado com sucesso',
            avatar: avatarUrl,
            user: userResponse
        });
        
    } catch (error) {
        console.error('Erro ao fazer upload do avatar:', error);
        
        // Deletar arquivo em caso de erro
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ message: error.message || 'Erro ao processar upload' });
    }
});

// Restante do código permanece o mesmo...
// Get user by ID (Protected - próprio usuário ou admin)
router.get('/:id', auth, async (req, res) => {
    try {
        // Verificar se usuário tem permissão (próprio usuário ou admin)
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile (Protected - próprio usuário)
router.patch('/:id', auth, async (req, res) => {
    try {
        // Verificar se usuário está atualizando seu próprio perfil
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const updates = req.body;
        
        // Não permitir atualização de senha por esta rota
        if (updates.password) {
            delete updates.password;
        }
        
        // Não permitir alteração de role (exceto admin)
        if (updates.role && req.userRole !== 'admin') {
            delete updates.role;
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user account (Protected - próprio usuário)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Verificar se usuário está deletando sua própria conta
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Deletar avatar se existir
        if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
            const avatarPath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        // Aqui você pode querer deletar dados relacionados
        // como appointments, reviews, etc.
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get featured providers (Public)
router.get('/featured', async (req, res) => {
    try {
        const providers = await User.find({ 
            role: 'provider',
            isVerified: true 
        })
        .sort({ rating: -1 })
        .limit(4)
        .select('-password');
        res.json(providers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get provider by id (Public)
router.get('/providers/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user || user.role !== 'provider') {
            return res.status(404).json({ message: 'Provider not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get provider reviews summary and list (Public)
router.get('/:id/reviews', async (req, res) => {
    try {
        const providerId = req.params.id;
        const reviews = await Appointment.find({ 
            providerId, 
            review: { $exists: true, $ne: null } 
        })
        .select('rating review createdAt clientId serviceId')
        .populate('clientId', 'name')
        .populate('serviceId', 'title');

        const count = reviews.length;
        const avg = count ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count) : 0;

        res.json({ 
            averageRating: Number(avg.toFixed(2)), 
            reviewsCount: count, 
            reviews 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;