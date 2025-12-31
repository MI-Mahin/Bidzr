'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Cricket Bat & Ball Icon
export const CricketIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Cricket bat blade */}
    <rect x="2" y="1" width="6" height="13" rx="1" />
    {/* Cricket bat handle */}
    <line x1="5" y1="14" x2="5" y2="22" strokeWidth="2" />
    {/* Cricket ball with seam */}
    <circle cx="15" cy="17" r="4" />
    <path d="M12.2 15.2C13 16.5 13 17.5 12.2 18.8" />
    <path d="M17.8 15.2C17 16.5 17 17.5 17.8 18.8" />
  </svg>
);

// Football/Soccer Icon
export const FootballIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2L12 6" />
    <path d="M12 18L12 22" />
    <path d="M2 12L6 12" />
    <path d="M18 12L22 12" />
    <polygon points="12,8 16,11 14,16 10,16 8,11" />
  </svg>
);

// Basketball Icon
export const BasketballIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2C12 12 12 12 12 22" />
    <path d="M2 12C12 12 12 12 22 12" />
    <path d="M4.93 4.93C9 9 9 9 12 12" />
    <path d="M19.07 4.93C15 9 15 9 12 12" />
  </svg>
);

// Kabaddi / Wrestling Icon
export const KabaddiIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="8" cy="4" r="2" />
    <path d="M6 8L4 14L8 16L6 22" />
    <path d="M8 8L12 10L14 8" />
    <circle cx="18" cy="4" r="2" />
    <path d="M18 8L20 14L16 16L18 22" />
    <path d="M16 8L14 10" />
  </svg>
);

// Gavel/Auction Icon
export const AuctionIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2L18.5 6L9.5 15L5.5 11L14.5 2Z" />
    <path d="M4.5 12L2 14.5L9.5 22L12 19.5L4.5 12Z" />
    <path d="M15 6L18 3" />
    <path d="M14 22H22" />
  </svg>
);

export const getSportIcon = (sport: string, props?: IconProps) => {
  switch (sport.toLowerCase()) {
    case 'cricket':
      return <CricketIcon {...props} />;
    case 'football':
      return <FootballIcon {...props} />;
    case 'basketball':
      return <BasketballIcon {...props} />;
    case 'kabaddi':
      return <KabaddiIcon {...props} />;
    default:
      return <CricketIcon {...props} />;
  }
};
