
"use client";

import type { TicketMessage } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserCircle, Briefcase, ShieldCheck, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { translateText, type TranslateTextInput } from '@/ai/flows/translate-text-flow';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '../common/LoadingSpinner';

interface MessageItemProps {
  message: TicketMessage;
  currentUserId: string;
}

export default function MessageItem({ message, currentUserId }: MessageItemProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const initials = message.senderDisplayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const { toast } = useToast();

  const SenderIcon = () => {
    if (isCurrentUser) return null; 
    switch (message.senderRole) {
      case 'user':
        return <UserCircle className="h-4 w-4 text-muted-foreground" />;
      case 'worker':
        return <Briefcase className="h-4 w-4 text-muted-foreground" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-muted-foreground" />;
      default:
        return <UserCircle className="h-4 w-4 text-muted-foreground" />; 
    }
  };

  const handleTranslateMessage = async () => {
    if (!message.message) return;

    if (!showOriginal) { // If currently showing translation, switch to original
      setShowOriginal(true);
      return;
    }

    setIsTranslating(true);
    // Basic language detection
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(message.message);
    const targetLanguage = isLikelyJapanese ? "English" : "Japanese";
    const sourceLanguage = isLikelyJapanese ? "Japanese" : "English";
    
    try {
      const input: TranslateTextInput = {
        textToTranslate: message.message,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage,
      };
      const result = await translateText(input);
      setTranslatedText(result.translatedText);
      setShowOriginal(false); // Show the new translation
    } catch (error) {
      console.error("Error translating message:", error);
      toast({ title: "Translation Error", description: "Could not translate the message.", variant: "destructive" });
      setTranslatedText(null);
      setShowOriginal(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const displayedMessageText = showOriginal || !translatedText ? message.message : translatedText;
  
  let translateButtonTitle = "Translate";
  if (isTranslating) {
    translateButtonTitle = "Translating...";
  } else if (showOriginal) {
    const isLikelyJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(message.message);
    translateButtonTitle = isLikelyJapanese ? "Translate to English" : "Translate to Japanese";
  } else {
    translateButtonTitle = "Show Original";
  }

  return (
    <div className={cn("flex gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
      <Card className={cn(
        "max-w-[75%] sm:max-w-[60%] shadow-sm",
        isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground border rounded-bl-none"
      )}>
        <CardHeader className="p-2 pb-1">
           <div className="flex items-center gap-1.5 text-xs">
            {!isCurrentUser && <SenderIcon />}
            <span className={cn(
              "font-semibold", 
              isCurrentUser ? "text-primary-foreground/90" : "text-foreground"
            )}>
              {message.senderDisplayName || 'Unknown User'}
            </span>
            {!isCurrentUser && (
              <span className="text-muted-foreground/80">
                ({message.senderRole})
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{displayedMessageText}</p>
          {message.message && ( // Only show button if there's a message
            <div className="mt-1 text-right">
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTranslateMessage}
                  disabled={isTranslating}
                  className="h-6 w-6 p-0"
                  title={translateButtonTitle}
              >
                  {isTranslating ? <LoadingSpinner size="sm"/> : <Languages className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className={cn(
          "p-2 pt-1 text-xs opacity-80",
           isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {message.timestamp && typeof message.timestamp.toDate === 'function' ? formatDistanceToNowStrict(message.timestamp.toDate()) + ' ago' : 'Sending...'}
        </CardFooter>
      </Card>
       {isCurrentUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
