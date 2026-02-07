import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

// Importar rotas
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import serviceRoutes from './routes/services.js';
import appointmentRoutes from './routes/appointments.js';
import providerRoutes from './routes/providers.js';

// =====================
// Configuração base ESM
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true
    }
});

// Disponibilizar io para rotas
app.set('io', io);

// =====================
// Middlewares globais
// =====================
app.use(cors());
app.use(express.json());

// Pasta de uploads (garante que exista)
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Rate limiting básico
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

// =====================
// Verificação do MongoDB
// =====================
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Serviço temporariamente indisponível. Conexão com banco de dados não estabelecida.'
        });
    }
    next();
});

// =====================
// Conexão com banco
// =====================
async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ MongoDB conectado');
        return;
    } catch (err) {
        console.error('❌ Erro ao conectar MongoDB:', err.message);
    }

    // Fallback: MongoDB em memória (DEV)
    try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();

        await mongoose.connect(memUri);
        app.set('mongod', mongod);

        console.log('⚠️ MongoDB em memória iniciado (DEV)');
    } catch (err2) {
        console.error('❌ Falha ao iniciar MongoDB em memória:', err2);
    }
}

connectDatabase();

// =====================
// Rotas
// =====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/providers', providerRoutes);

// =====================
// WebSocket (Socket.IO)
// =====================
io.on('connection', (socket) => {
    console.log('🟢 Cliente conectado:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} entrou na sala ${roomId}`);
    });

    socket.on('appointment-update', (data) => {
        io.to(data.appointmentId).emit('status-updated', data);
    });

    socket.on('send-message', (data) => {
        io.to(data.roomId).emit('new-message', data);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Cliente desconectado:', socket.id);
    });
});

// =====================
// Server
// =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
