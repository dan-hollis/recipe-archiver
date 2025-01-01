import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async (recipientId) => {
        const response = await fetch(`/api/messages/${recipientId}`);
        return response.json();
    }
);

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        messages: {},
        activeChats: [],
        typing: {},
        status: 'idle',
        error: null
    },
    reducers: {
        messageReceived(state, action) {
            const { recipientId, message } = action.payload;
            if (!state.messages[recipientId]) {
                state.messages[recipientId] = [];
            }
            state.messages[recipientId].push(message);
        },
        setTyping(state, action) {
            const { userId, isTyping } = action.payload;
            state.typing[userId] = isTyping;
        },
        addReaction(state, action) {
            const { messageId, reaction, userId } = action.payload;
            const message = state.messages[action.meta.arg]?.find(m => m.id === messageId);
            if (message) {
                if (!message.reactions) message.reactions = [];
                message.reactions.push({ reaction, user_id: userId });
            }
        },
        updateMessageStatus(state, action) {
            const { messageId, status, timestamp } = action.payload;
            const message = state.messages[action.meta.arg]?.find(m => m.id === messageId);
            if (message) {
                if (status === 'read') message.read_at = timestamp;
                if (status === 'delivered') message.delivered_at = timestamp;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMessages.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.messages[action.meta.arg] = action.payload;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
    }
}); 