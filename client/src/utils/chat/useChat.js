import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { socket } from '../socket';

export function useChat(recipientId) {
    const queryClient = useQueryClient();
    const [isTyping, setIsTyping] = useState(false);
    
    useEffect(() => {
        socket.on('user_typing', (data) => {
            if (data.user_id === recipientId) {
                setIsTyping(data.is_typing);
            }
        });

        return () => {
            socket.off('user_typing');
        };
    }, [recipientId]);

    const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['messages', recipientId],
        queryFn: ({ pageParam = 1 }) => 
            fetchMessages(recipientId, pageParam),
        getNextPageParam: (lastPage) => lastPage.next_page,
    });

    const sendMessageMutation = useMutation({
        mutationFn: (message) => {
            socket.emit('message_input', { 
                data: { 
                    message,
                    recipient_id: recipientId 
                } 
            });
        },
        onMutate: async (newMessage) => {
            await queryClient.cancelQueries(['messages', recipientId]);
            const previousMessages = queryClient.getQueryData(['messages', recipientId]);
            
            queryClient.setQueryData(['messages', recipientId], (old) => ({
                ...old,
                pages: [
                    { messages: [newMessage, ...old.pages[0].messages] },
                    ...old.pages.slice(1),
                ],
            }));
            
            return { previousMessages };
        },
    });

    const handleTyping = (isTyping) => {
        socket.emit('handle_typing', {
            recipient_id: recipientId,
            is_typing: isTyping
        });
    };

    return {
        messages: data?.pages.flatMap(page => page.messages) ?? [],
        sendMessage: sendMessageMutation.mutate,
        loadMore: fetchNextPage,
        hasMore: hasNextPage,
        isTyping,
        handleTyping,
    };
}