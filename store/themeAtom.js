// themeAtom.js
import { atom } from 'jotai';

// Define the structure and default values for the theme
const defaultTheme = {
  pagePadding: 40,
  pageMarginLeft: 20,
  pageMarginRight: 20,
  pageBackgroundColor: '#FFFFFF',
  defaultTextColor: '#1f2937', // gray-800
  defaultFontSize: 12,
};

export const themeAtom = atom(defaultTheme);