import express from 'express';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apenas prestadores podem acessar estas rotas
router.use(auth, authorize('provider'));

// Update provider-specific profile
router.patch('/:id/profile', async (req, res) => {
    try {
        if (req.userId !== req.params.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { profile } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    'profile.bio': profile.bio,
                    'profile.specialty': profile.specialty,
                    'profile.experience': profile.experience,
                    'profile.consultationFee': profile.consultationFee,
                    'profile.qualifications': profile.qualifications,
                    'profile.languages': profile.languages,
                    'profile.servicesOffered': profile.servicesOffered
                }
            },
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

// Update provider availability
router.patch('/:id/availability', async (req, res) => {
    try {
        if (req.userId !== req.params.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { availability } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 'profile.availability': availability },
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;