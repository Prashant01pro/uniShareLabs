import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { INotification } from '../types';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

export interface SocketContextType {
  notifications: INotification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notification: Omit<INotification, 'id' | 'timestamp' | 'read'>) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, activeRole, token } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const appendNotification = useCallback(
    (notif: Omit<INotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: INotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    },
    []
  );

  useEffect(() => {
    const socket = socketService.connect(token || undefined);

    const onConnect = () => {
      setIsConnected(true);
      if (currentUser?._id) {
        socketService.joinUserRoom(currentUser._id);
      }
      if (activeRole) {
        socketService.joinRoleRoom(activeRole);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(socket.connected);
    if (socket.connected) {
      if (currentUser?._id) socketService.joinUserRoom(currentUser._id);
      if (activeRole) socketService.joinRoleRoom(activeRole);
    }

    const handleBookingCreated = (data: any) => {
      appendNotification({
        type: 'booking:created',
        title: 'New Booking Created',
        message: data.resourceName
          ? `Booking submitted for ${data.resourceName}`
          : `Reservation #${data.bookingId?.slice(-6) || ''} received.`,
        severity: 'info',
        data,
      });
    };

    const handleBookingApproved = (data: any) => {
      appendNotification({
        type: 'booking:approved',
        title: 'Booking Approved',
        message: `Your booking #${data.bookingId?.slice(-6) || ''} was approved by ${
          data.approverName || 'reviewer'
        }.`,
        severity: 'success',
        data,
      });
    };

    const handleBookingRejected = (data: any) => {
      appendNotification({
        type: 'booking:rejected',
        title: 'Booking Rejected',
        message: data.message || `Booking was not approved (${data.reasonCode || 'Review complete'}).`,
        severity: 'error',
        data,
      });
    };

    const handleWaitlistPromoted = (data: any) => {
      appendNotification({
        type: 'waitlist:promoted',
        title: 'Waitlist Spot Promoted!',
        message: `A slot opened up! You have been offered priority booking. Accept within the offer window.`,
        severity: 'success',
        data,
      });
    };

    const handleIncidentCreated = (data: any) => {
      appendNotification({
        type: 'incident:created',
        title: `Incident Ticket: ${data.category || 'Attention Required'}`,
        message: data.description || `Severity: ${data.severity || 'HIGH'} - Under review.`,
        severity: 'warning',
        data,
      });
    };

    const handleResourceStatus = (data: any) => {
      appendNotification({
        type: 'resource:status',
        title: 'Resource Status Changed',
        message: `${data.resourceName || 'Resource'} is now ${data.status}.`,
        severity: data.status === 'AVAILABLE' ? 'info' : 'warning',
        data,
      });
    };

    const handleBookingCheckedIn = (data: any) => {
      appendNotification({
        type: 'booking:checked_in',
        title: 'Check-In Confirmed',
        message: `Digital handover completed. Access PIN released.`,
        severity: 'info',
        data,
      });
    };

    const handleBookingReturned = (data: any) => {
      appendNotification({
        type: 'booking:returned',
        title: 'Resource Return Signed Off',
        message: data.flagged
          ? `Return inspection recorded with condition anomaly.`
          : `Session successfully returned and inspected.`,
        severity: data.flagged ? 'warning' : 'success',
        data,
      });
    };

    const handleTrustScoreUpdated = (data: any) => {
      const deltaSign = data.delta > 0 ? `+${data.delta}` : `${data.delta}`;
      appendNotification({
        type: 'trust_score:updated',
        title: 'Trust Standing Updated',
        message: `Trust score changed to ${data.newScore} (${deltaSign}). ${data.reason || ''}`,
        severity: data.delta >= 0 ? 'success' : 'warning',
        data,
      });
    };

    const handleSystemNotification = (data: any) => {
      appendNotification({
        type: 'system:notification',
        title: data.title || 'System Notification',
        message: data.message || '',
        severity: data.severity || 'info',
        data,
      });
    };

    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:approved', handleBookingApproved);
    socket.on('booking:rejected', handleBookingRejected);
    socket.on('waitlist:promoted', handleWaitlistPromoted);
    socket.on('incident:created', handleIncidentCreated);
    socket.on('resource:status', handleResourceStatus);
    socket.on('resource:status_changed', handleResourceStatus);
    socket.on('booking:checked_in', handleBookingCheckedIn);
    socket.on('booking:returned', handleBookingReturned);
    socket.on('trust_score:updated', handleTrustScoreUpdated);
    socket.on('system:notification', handleSystemNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('booking:created', handleBookingCreated);
      socket.off('booking:approved', handleBookingApproved);
      socket.off('booking:rejected', handleBookingRejected);
      socket.off('waitlist:promoted', handleWaitlistPromoted);
      socket.off('incident:created', handleIncidentCreated);
      socket.off('resource:status', handleResourceStatus);
      socket.off('resource:status_changed', handleResourceStatus);
      socket.off('booking:checked_in', handleBookingCheckedIn);
      socket.off('booking:returned', handleBookingReturned);
      socket.off('trust_score:updated', handleTrustScoreUpdated);
      socket.off('system:notification', handleSystemNotification);
    };
  }, [currentUser?._id, activeRole, token, appendNotification]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        addNotification: appendNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
