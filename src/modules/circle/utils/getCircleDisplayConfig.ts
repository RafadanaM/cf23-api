import type { CircleDisplayConfig } from '../types/Circle';

const displayConfig = new Map<string, CircleDisplayConfig>([
  [
    'A',
    {
      backgroundColor: '#fee2e2',
      borderColor: '#fca5a5',
      backgroundColorHover: '#fecaca'
    }
  ],
  [
    'B',
    {
      backgroundColor: '#ffedd5',
      borderColor: '#fdba74',
      backgroundColorHover: '#fed7aa'
    }
  ],
  [
    'C',
    {
      backgroundColor: '#fef3c7',
      borderColor: '#fcd34d',
      backgroundColorHover: '#fde68a'
    }
  ],
  [
    'D',
    {
      backgroundColor: '#fef9c3',
      borderColor: '#fde047',
      backgroundColorHover: '#fef08a'
    }
  ],
  [
    'E',
    {
      backgroundColor: '#ecfccb',
      borderColor: '#bef264',
      backgroundColorHover: '#d9f99d'
    }
  ],
  [
    'F',
    {
      backgroundColor: '#dcfce7',
      borderColor: '#86efac',
      backgroundColorHover: '#bbf7d0'
    }
  ],
  [
    'G',
    {
      backgroundColor: '#d1fae5',
      borderColor: '#6ee7b7',
      backgroundColorHover: '#a7f3d0'
    }
  ],
  [
    'H',
    {
      backgroundColor: '#ccfbf1',
      borderColor: '#5eead4',
      backgroundColorHover: '#99f6e4'
    }
  ],
  [
    'I',
    {
      backgroundColor: '#e0f2fe',
      borderColor: '#7dd3fc',
      backgroundColorHover: '#bae6fd'
    }
  ],
  [
    'J',
    {
      backgroundColor: '#e0e7ff',
      borderColor: '#a5b4fc',
      backgroundColorHover: '#c7d2fe'
    }
  ],
  [
    'K',
    {
      backgroundColor: '#ede9fe',
      borderColor: '#c4b5fd',
      backgroundColorHover: '#ddd6fe'
    }
  ],
  [
    'L',
    {
      backgroundColor: '#fae8ff',
      borderColor: '#f0abfc',
      backgroundColorHover: '#f5d0fe'
    }
  ],
  [
    'M',
    {
      backgroundColor: '#fce7f3',
      borderColor: '#f472b6',
      backgroundColorHover: '#fbcfe8'
    }
  ],
  [
    'N',
    {
      backgroundColor: '#ffe4e6',
      borderColor: '#fda4af',
      backgroundColorHover: '#fecdd3'
    }
  ],
  [
    'O',
    {
      backgroundColor: '#fff1f2',
      borderColor: '#fecdd3',
      backgroundColorHover: '#ffe4e6'
    }
  ],
  [
    'P',
    {
      backgroundColor: '#fff7ed',
      borderColor: '#ffedd5',
      backgroundColorHover: '#fed7aa'
    }
  ],
  [
    'Q',
    {
      backgroundColor: '#fffbebf',
      borderColor: '#fde68a',
      backgroundColorHover: '#fef3c7'
    }
  ],
  [
    'R',
    {
      backgroundColor: '#f7fee7',
      borderColor: '#d9f99d',
      backgroundColorHover: '#ecfccb'
    }
  ],
  [
    'S',
    {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      backgroundColorHover: '#dcfce7'
    }
  ],
  [
    'T',
    {
      backgroundColor: '#ecfeff',
      borderColor: '#a5f3fc',
      backgroundColorHover: '#cffafe'
    }
  ],
  [
    'U',
    {
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      backgroundColorHover: '#e0f2fe'
    }
  ],
  [
    'V',
    {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      backgroundColorHover: '#ede9fe'
    }
  ],
  [
    'W',
    {
      backgroundColor: '#fdf4ff',
      borderColor: '#f5d0fe',
      backgroundColorHover: '#fae8ff'
    }
  ],
  [
    'X',
    {
      backgroundColor: '#fff1f5',
      borderColor: '#fbcfe8',
      backgroundColorHover: '#fce7f3'
    }
  ],
  [
    'Y',
    {
      backgroundColor: '#fff7f7',
      borderColor: '#fecdd3',
      backgroundColorHover: '#ffe4e6'
    }
  ],
  [
    'Z',
    {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
      backgroundColorHover: '#fecaca'
    }
  ],
  [
    'AA',
    {
      backgroundColor: '#fff8f1',
      borderColor: '#fdba74',
      backgroundColorHover: '#ffedd5'
    }
  ],
  [
    'AB',
    {
      backgroundColor: '#fefce8',
      borderColor: '#fde047',
      backgroundColorHover: '#fef9c3'
    }
  ],
  [
    'AC',
    {
      backgroundColor: '#f4fce3',
      borderColor: '#bef264',
      backgroundColorHover: '#ecfccb'
    }
  ],
  [
    'AD',
    {
      backgroundColor: '#e6fcf5',
      borderColor: '#6ee7b7',
      backgroundColorHover: '#d1fae5'
    }
  ],
  [
    'AE',
    {
      backgroundColor: '#e6faf8',
      borderColor: '#5eead4',
      backgroundColorHover: '#ccfbf1'
    }
  ],
  [
    'AF',
    {
      backgroundColor: '#ebf8ff',
      borderColor: '#7dd3fc',
      backgroundColorHover: '#e0f2fe'
    }
  ],
  [
    'AG',
    {
      backgroundColor: '#f3e8ff',
      borderColor: '#c4b5fd',
      backgroundColorHover: '#ede9fe'
    }
  ]
]);

function getCircleDisplayConfig(circleLetter: string): CircleDisplayConfig {
  // return {
  //   backgroundColor: '#fafafa',
  //   borderColor: '#6e6e6e',
  //   backgroundColorHover: '#818285'
  // };

  return (
    displayConfig.get(circleLetter.toUpperCase()) ?? {
      backgroundColor: '#def7c9',
      borderColor: '#7cd123',
      backgroundColorHover: '#b3e582'
    }
  );
}

export default getCircleDisplayConfig;
