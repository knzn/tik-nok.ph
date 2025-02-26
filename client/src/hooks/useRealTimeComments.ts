import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

interface Comment {
  _id: string;
  content: string;
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  video: string;
  createdAt: string;
  updatedAt: string;
}

export const useRealTimeComments = (videoId: string, initialComments: Comment[] = []) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !videoId) return;

    // Join video-specific room
    socket.emit('join-video', videoId);

    // Listen for new comments
    socket.on('comment:new', (newComment: Comment) => {
      if (newComment.video === videoId) {
        setComments(prevComments => [newComment, ...prevComments]);
      }
    });

    // Listen for comment updates
    socket.on('comment:update', (updatedComment: Comment) => {
      if (updatedComment.video === videoId) {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment._id === updatedComment._id ? updatedComment : comment
          )
        );
      }
    });

    // Listen for comment deletions
    socket.on('comment:delete', (commentId: string) => {
      setComments(prevComments => 
        prevComments.filter(comment => comment._id !== commentId)
      );
    });

    // Clean up event listeners
    return () => {
      socket.off('comment:new');
      socket.off('comment:update');
      socket.off('comment:delete');
    };
  }, [socket, videoId]);

  // Function to add a new comment
  const addComment = (content: string, userId: string, username: string, profilePicture?: string) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newComment: Comment = {
      _id: tempId,
      content,
      user: {
        _id: userId,
        username,
        profilePicture
      },
      video: videoId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setComments(prevComments => [newComment, ...prevComments]);

    // The actual API call will be handled elsewhere
    // When the server emits the 'comment:new' event, it will replace our temporary comment
  };

  return { comments, addComment };
}; 