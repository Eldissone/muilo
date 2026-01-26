import express from 'express';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import Appointment from '../models/Appointment.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

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
        // Em produção, você deve usar um serviço como AWS S3 ou Cloudinary
        const uploadDir = 'uploads/avatars/';
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // Aceitar apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});

// Rota para upload de avatar
router.patch('/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (req.userId !== req.params.id && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma imagem enviada' });
        }
        
        // Criar URL para a imagem
        // Em produção, use uma URL completa do seu servidor ou CDN
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Atualizar usuário com nova URL do avatar
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            message: 'Avatar atualizado com sucesso',
            avatar: avatarUrl,
            user: user
        });
        
    } catch (error) {
        console.error('Erro ao fazer upload do avatar:', error);
        res.status(500).json({ message: error.message });
    }
});

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
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
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