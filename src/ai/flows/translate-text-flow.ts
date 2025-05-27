
'use server';
/**
 * @fileOverview A text translation AI flow.
 *
 * - translateText - A function that handles text translation.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit/zod';

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The text to be translated.'),
  targetLanguage: z.string().describe('The target language for translation (e.g., "Japanese", "English").'),
  sourceLanguage: z.string().optional().describe('The source language of the text (e.g., "English", "Japanese"). If not provided, the model will attempt to detect it.'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const translateTextGenerationPrompt = ai.definePrompt({
  name: 'translateTextGenerationPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the following text {{#if sourceLanguage}}from {{sourceLanguage}}{{else}}from its original language{{/if}} to {{targetLanguage}}.
Respond with only the translated text.

Text to translate:
{{{textToTranslate}}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const {output} = await translateTextGenerationPrompt(input);
    if (!output) {
        throw new Error('Translation failed to produce output.');
    }
    return output;
  }
);
