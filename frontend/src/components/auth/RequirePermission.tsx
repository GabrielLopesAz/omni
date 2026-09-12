import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RequirePermissionProps {
  allowedRoles: string[];
  behavior?: 'hide' | 'disable';
  children: React.ReactElement;
}

export function RequirePermission({ allowedRoles, behavior = 'hide', children }: RequirePermissionProps) {
  const { user } = useAuth();
  const hasPermission = user?.role ? allowedRoles.includes(user.role) : false;

  if (hasPermission) {
    return children;
  }

  if (behavior === 'hide') {
    return null;
  }

  // Comportamento 'disable': Clona o elemento filho e injeta disabled
  // Atenção: O elemento filho deve aceitar a prop 'disabled' e 'className' para estilização visual.
  return React.cloneElement(children, {
    disabled: true,
    className: `${children.props.className || ''} opacity-50 cursor-not-allowed pointer-events-none`,
    onClick: undefined,
  });
}
