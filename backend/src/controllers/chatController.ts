import { ChatMessage, ChatRoom } from '../types/chatTypes';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '../generated/prisma';

import { Router, Request, Response } from 'express';

async function chatFunction(
    req: Request,
    res: Response,
    chatRoom: ChatRoom,
    message: ChatMessage
) {
    try{
        const newMessage: ChatMessage = {
            id: req.body.id,
            userId: req.body.userId,
            message: req.body.message,
            timestamp: new Date(),
            type: req.body.type,
            animationData: null
        };



    }
    catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}