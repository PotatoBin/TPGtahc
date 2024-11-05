import express from 'express';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/gpt', async (req, res) => {
    const { prompt, theme } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: '질문을 입력해주세요' });
    }

    if (!theme) {
        return res.status(400).json({ error: 'theme 값을 입력해주세요' });
    }

    try {
        const systemPrompt = await fs.readFile(`${theme}.txt`, 'utf-8');

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-0125',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            functions: [
                {
                    name: "question_answer",
                    description: "Provides an answer and a follow-up question",
                    parameters: {
                        type: "object",
                        properties: {
                            answer_text: {
                                type: "string",
                                description: "질문에 대한 답변. 2723년의 인공지능의 잘못된 추측"
                            },
                            question_text: {
                                type: "string",
                                description: "answer text의 내용에 대한 전시를 관람하는 관람객 입장에서 할법한 반박 질문"
                            }
                        },
                        required: ["answer_text", "question_text"],
                        additionalProperties: false
                    }
                }
            ],
            function_call: { name: "question_answer" }
        });

        const gptChoice = response.choices[0];
        let parsedResponse;

        if (gptChoice && gptChoice.message.function_call) {
            const gptResponse = gptChoice.message.function_call.arguments;
            parsedResponse = JSON.parse(gptResponse); 
        } else {
            parsedResponse = { error: 'No function call response' };
        }

        res.json(parsedResponse);
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
