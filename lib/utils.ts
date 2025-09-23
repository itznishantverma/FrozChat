import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate random guest names like "Brave Bear", "Swift Eagle"
export function generateGuestName(gender?: string): string {
  const adjectives = [
    'Brave', 'Swift', 'Mystic', 'Golden', 'Silver', 'Crystal', 'Shadow', 'Bright',
    'Wild', 'Noble', 'Fierce', 'Gentle', 'Bold', 'Wise', 'Ancient', 'Royal',
    'Cosmic', 'Electric', 'Frozen', 'Blazing', 'Stellar', 'Thunder', 'Ocean',
    'Mountain', 'Forest', 'Desert', 'Storm', 'Lightning', 'Crimson', 'Azure'
  ];
  
  const nouns = [
    'Wolf', 'Eagle', 'Bear', 'Tiger', 'Dragon', 'Phoenix', 'Lion', 'Hawk',
    'Panther', 'Falcon', 'Raven', 'Fox', 'Shark', 'Whale', 'Dolphin', 'Owl',
    'Jaguar', 'Leopard', 'Cobra', 'Viper', 'Stallion', 'Mustang', 'Bison',
    'Elk', 'Deer', 'Rabbit', 'Squirrel', 'Otter', 'Badger', 'Wolverine'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdjective} ${randomNoun}`;
}

// Generate avatar initials from name
export function getAvatarFromName(name: string): string {
  if (!name) return 'A';
  
  const words = name.split(' ');
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  return name.charAt(0).toUpperCase();
}