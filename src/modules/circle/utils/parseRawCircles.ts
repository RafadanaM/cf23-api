import { DOMParser, HTMLScriptElement } from 'linkedom';

import { ParsingError } from '@core/errors/errors';

import type {
  AttendingDay,
  BoothRect,
  Circle,
  CircleType,
  DefaultCircleType,
  LargeCircleType,
  NormalizedCircles,
  Rating,
  SocialMediaDetail
} from '../types/Circle';
import { isDefaultCircle, isLargeCircle } from './circleType';
import getCircleDisplayConfig from './getCircleDisplayConfig';

type RawDay = 'Both Days' | 'SAT' | 'SUN';

type RawCircleType = 'Booth_B' | 'Booth_A' | '1 Space(s)' | '2 Space(s)' | '4 Space(s)';

type RawCircle = {
  id: number;
  user_id: string;
  circle_code: string;
  name: string;
  circle_cut: string;
  SellsCommision: boolean;
  SellsComic: boolean;
  SellsArtbook: boolean;
  SellsPhotobookGeneral: boolean;
  SellsNovel: boolean;
  SellsGame: boolean;
  SellsMusic: boolean;
  SellsGoods: boolean;
  circle_facebook: string | null;
  circle_instagram: string | null;
  circle_twitter: string | null;
  circle_other_socials: string | null;
  marketplace_link: string | null;
  fandom: string;
  other_fandom: string;
  rating: Rating;
  sampleworks_images: string[] | null;
  day: RawDay;
  SellsHandmadeCrafts: boolean;
  SellsMagazine: boolean;
  SellsPhotobookCosplay: boolean;
  circle_type: RawCircleType;
};

type RawState = {
  circle: {
    allCircle: RawCircle[];
  };
};

// const MAP_WIDTH = 7680;
// const MAP_HEIGHT = 3981;

// split by comma only if not wrapped in paranthesis, split by . thats followed by space
const FANDOM_SPLIT_PATTERN = /,\s*(?![^(]*\))|(?<=\S)\.\s+(?![^(]*\))/;

const B_CHAR_CODE = 'B'.charCodeAt(0);
const E_CHAR_CODE = 'E'.charCodeAt(0);
const I_CHAR_CODE = 'I'.charCodeAt(0);
const M_CHAR_CODE = 'M'.charCodeAt(0);
const Q_CHAR_CODE = 'Q'.charCodeAt(0);
const Y_CHAR_CODE = 'Y'.charCodeAt(0);

function parseRawCircles(htmlString: string): NormalizedCircles {
  const parser = new DOMParser();

  const doc = parser.parseFromString(htmlString, 'text/html');

  const scripts = doc.querySelectorAll('script') as HTMLScriptElement[];

  const selectedScript = scripts.find((script) =>
    script.textContent.includes('window.__INITIAL_STATE__')
  );

  if (!selectedScript) {
    throw new ParsingError('Expected Script Not Found');
  }

  const scriptContent = selectedScript.textContent.trim();

  const openBracket = scriptContent.indexOf('{');
  const closeBracket = scriptContent.lastIndexOf('}');

  const stringObj = scriptContent.slice(openBracket, closeBracket + 1);

  try {
    const obj = JSON.parse(stringObj) as RawState;
    return parseAllCircle(obj.circle.allCircle);
  } catch (e) {
    let message = Error.isError(e) ? e.message : '';

    throw new ParsingError('Failed to Parse string object: ' + message);
  }
}

export default parseRawCircles;

function parseAllCircle(allCircles: RawCircle[]): NormalizedCircles {
  const normalizedCirles: Circle[] = [];
  const allFandoms = new Set<string>();

  allCircles.forEach((rawCircle) => {
    const code = normalizeCircleCode(rawCircle.circle_code);
    const circleType = normalizeRawCircleType(rawCircle.circle_type);
    const fandoms = normalizeFandoms(rawCircle.fandom, rawCircle.other_fandom);

    normalizedCirles.push({
      id: String(rawCircle.id),
      code,
      name: rawCircle.name.trim(),
      imageUrl: rawCircle.circle_cut,
      sampleWorks: rawCircle.sampleworks_images ?? [],
      sampleWorkThumbnails: rawCircle.sampleworks_images ?? [],
      rating: rawCircle.rating,
      circleType,
      attendingDays: normalizeDay(rawCircle.day),
      fandoms,
      socialMedias: normalizeSocialMedia(rawCircle),
      workTypes: normalizeWorkTypes(rawCircle),
      rect: getBoothRect(code, circleType),
      displayConfig: getCircleDisplayConfig(parseCircleCode(code, circleType).boothLetter)
    });

    fandoms.forEach((fandom) => {
      allFandoms.add(fandom);
    });
  });

  return {
    circles: normalizedCirles,
    fillerCircles: [],
    fandoms: []
  };
}

type ParsedDefaultCircleCode = {
  boothLetter: string;
  boothStartNumber: number;
  boothSize: number;
  boothSubLetter: string;
  circleType: DefaultCircleType;
};

type ParsedLargeCircleCode = {
  boothLetter: string;
  boothStartNumber: number;
  boothSize: number;
  boothSubLetter: undefined;
  circleType: LargeCircleType;
};
/**
 * there's definitely better way to express raw circle code,
 * but I just want to get this done
 */
type ParsedCircleCode = ParsedDefaultCircleCode | ParsedLargeCircleCode;
function parseCircleCode(circleCode: string, circleType: CircleType): ParsedCircleCode {
  const defaultValue = isLargeCircle(circleType)
    ? {
        boothLetter: '',
        boothStartNumber: 0,
        boothSize: 0,
        circleType: circleType
      }
    : {
        boothLetter: '',
        boothStartNumber: 0,
        boothSize: 0,
        circleType: circleType,
        boothSubLetter: ''
      };
  return circleCode
    .split('/')
    .reduce<ParsedCircleCode>((acc: ParsedCircleCode, boothCode, idx) => {
      const [letter, rightSide] = boothCode.split('-');

      if (idx === 0 && letter && rightSide) {
        acc.boothLetter = letter;
        acc.boothStartNumber = Number(rightSide.slice(0, 2));
      }

      if (rightSide && rightSide.length > 2) {
        const subLetter = rightSide.slice(2, 4).trim();

        acc.boothSize += subLetter.length - 1;
        acc.boothSubLetter = subLetter;
      }

      acc.boothSize += 1;

      return acc;
    }, defaultValue);
}

function getBoothRect(circleCode: string, circleType: CircleType): BoothRect {
  // assume a circles will not have booths that have different letter
  const parsedCircleCode = parseCircleCode(circleCode, circleType);
  return calculateRect(parsedCircleCode);
}

function calculateRect(parsedCircleCode: ParsedCircleCode): BoothRect {
  // AA Booths
  if (
    parsedCircleCode.boothLetter === 'AA' &&
    isLargeParsedCircleCode(parsedCircleCode)
  ) {
    return calculateAABoothRect(parsedCircleCode);
  }

  // Ab - Ag  Booths
  if (
    parsedCircleCode.boothLetter.length === 2 &&
    isLargeParsedCircleCode(parsedCircleCode)
  ) {
    return calculateAxBoothRect(parsedCircleCode);
  }

  if (
    parsedCircleCode.boothLetter === 'A' &&
    isDefaultParsedCircleCode(parsedCircleCode)
  ) {
    return calculateABoothRect(parsedCircleCode);
  }

  if (
    parsedCircleCode.boothLetter === 'Z' &&
    isDefaultParsedCircleCode(parsedCircleCode)
  ) {
    return calculateZBoothRect(parsedCircleCode);
  }

  // B until Y
  const boothCharCode = parsedCircleCode.boothLetter.charCodeAt(0);
  if (
    boothCharCode >= B_CHAR_CODE &&
    // parsedCircleCode.boothStartNumber >= 1 &&
    // parsedCircleCode.boothStartNumber <= 2 &&
    boothCharCode <= Y_CHAR_CODE &&
    isDefaultParsedCircleCode(parsedCircleCode)
  ) {
    return calculateRestBoothRect(parsedCircleCode);
  }

  return {
    height: 0,
    width: 0,
    direction: 'VERTICAL',
    x: 0,
    y: 0
  };
}

const HORIZONTAL_REST_BOOTH_NUMS = [
  1, 7, 8, 15, 16, 23, 24, 30, 31, 37, 38, 45, 46, 53, 54, 60
];

const BOOTH_REST_HEIGHT = 45;
function calculateRestBoothRect({
  circleType: _circleType,
  boothStartNumber,
  boothLetter,
  boothSize,
  boothSubLetter
}: ParsedDefaultCircleCode): BoothRect {
  const baseX = 4644;
  const baseY = 2860;

  const direction = HORIZONTAL_REST_BOOTH_NUMS.includes(boothStartNumber)
    ? 'HORIZONTAL'
    : 'VERTICAL';

  const isHorizontal = direction === 'HORIZONTAL';
  const isUpwards = boothStartNumber <= 30;

  // default width & height
  let width = 38;
  let height = 21;

  if (isHorizontal) {
    width = 19;
    height = 42;

    width = width * boothSize;
  } else {
    height = height * boothSize + (boothSize === 4 ? 2 : 0);
  }

  // ##### X OFFSET #####
  const numberOffsetX = boothStartNumber > 30 ? 39 : 0;

  const boothSubLetterOffsetX = isHorizontal && boothSubLetter === 'b' ? -19 : 0;

  const boothLetterOffsetX = 140 * (boothLetter.charCodeAt(0) - B_CHAR_CODE);

  // gap from E
  const firstGapOffsetX = boothLetter.charCodeAt(0) > E_CHAR_CODE ? 39 : 0;

  // gap from I
  const secondGapOffsetX = boothLetter.charCodeAt(0) > I_CHAR_CODE ? 22 : 0;

  // gap from M
  const thirdGapOffsetX = boothLetter.charCodeAt(0) > M_CHAR_CODE ? 40 : 0;

  // gap from Q
  const fourthGapOffsetX = boothLetter.charCodeAt(0) > Q_CHAR_CODE ? 19 : 0;

  // TODO: HANDLE FROM T TO Y

  const gapOffsetX =
    firstGapOffsetX + secondGapOffsetX + thirdGapOffsetX + fourthGapOffsetX;

  // ##### Y OFFSET #####

  const columnIndex = isUpwards ? boothStartNumber - 1 : 60 - boothStartNumber;

  const numberOffsetY = BOOTH_REST_HEIGHT * columnIndex;

  const offsetLetter = isUpwards ? 'a' : 'b';
  const boothSubLetterOffsetY =
    !isHorizontal && boothSubLetter === offsetLetter ? -21 : 0;
  const sizeOffsetY =
    isHorizontal || !isUpwards || boothSize !== 4
      ? 0
      : BOOTH_REST_HEIGHT * (boothSize - 3);

  const firstGapOffsetY = boothStartNumber > 7 && boothStartNumber < 54 ? 90 : 0;
  const secondGapOffsetY = boothStartNumber > 15 && boothStartNumber < 46 ? 206 : 0;
  const thirdGapOffsetY = boothStartNumber > 23 && boothStartNumber < 38 ? 90 : 0;

  const gapOffsetY = firstGapOffsetY + secondGapOffsetY + thirdGapOffsetY;

  return {
    x: baseX - numberOffsetX - boothLetterOffsetX - boothSubLetterOffsetX - gapOffsetX,
    y: baseY - numberOffsetY - sizeOffsetY - boothSubLetterOffsetY - gapOffsetY,
    direction,
    height,
    width
  };
}

function calculateZBoothRect({
  circleType: _circleType,
  boothStartNumber,
  boothLetter: _boothLetter,
  boothSize,
  boothSubLetter
}: ParsedDefaultCircleCode): BoothRect {
  const baseX = 4298;
  const baseY = 1000;

  const boothNumberOffsetX = (boothStartNumber - 1) * 41;
  const boothSubLetterOffsetX =
    boothSubLetter === 'ab' || boothSubLetter === 'b' ? 19 : 0;

  const boothSizeOffsetX = Math.max(boothSize - 2, 0) * 21;

  const widthOffset = boothSize === 4 ? 3 : 0;

  const firstOffsetXGap = boothStartNumber > 4 ? -3 : 0;
  const secondOffsetXGap = boothStartNumber > 8 ? 118 : 0;
  const thirdOffsetXGap = boothStartNumber > 12 ? 280 : 0;
  const fourthOffsetXGap = boothStartNumber > 16 ? 90 : 0;
  const fifthOffsetXGap = boothStartNumber > 20 ? 65 : 0;
  const sixthOffsetXGap = boothStartNumber > 24 ? 50 : 0;
  const seventhOffsetXGap = boothStartNumber > 28 ? 505 : 0;

  // TODO: handle Gap for 33-36, 37-40

  return {
    x:
      baseX -
      boothNumberOffsetX -
      boothSubLetterOffsetX -
      boothSizeOffsetX -
      firstOffsetXGap -
      secondOffsetXGap -
      thirdOffsetXGap -
      fourthOffsetXGap -
      fifthOffsetXGap -
      sixthOffsetXGap -
      seventhOffsetXGap,
    y: baseY,
    direction: 'HORIZONTAL',
    height: 40,
    width: 19 * boothSize + widthOffset
  };
}

function calculateABoothRect({
  circleType: _circleType,
  boothStartNumber,
  boothLetter: _boothLetter,
  boothSize,
  boothSubLetter
}: ParsedDefaultCircleCode): BoothRect {
  const baseX = 4886;
  const baseY = 3036;

  const boothNumberOffsetX = (boothStartNumber - 1) * 41;
  const boothSubLetterOffsetX =
    boothSubLetter === 'ab' || boothSubLetter === 'b' ? 19 : 0;

  const boothSizeOffsetX = Math.max(boothSize - 2, 0) * 21;

  const firstOffsetXGap = boothStartNumber > 4 ? 35 : 0;
  const secondOffsetXGap = boothStartNumber > 8 ? 33 : 0;
  const thirdOffsetXGap = boothStartNumber > 12 ? 379 : 0;
  const fourthOffsetXGap = boothStartNumber > 16 ? 35 : 0;
  const fifthOffsetXGap = boothStartNumber > 20 ? 47 : 0;
  const sixthOffsetXGap = boothStartNumber > 24 ? 26 : 0;
  const seventhOffsetXGap = boothStartNumber > 28 ? 378 : 0;
  const eightOffsetXGap = boothStartNumber > 32 ? 26 : 0;
  const ninthOffsetXGap = boothStartNumber > 36 ? 54 : 0;

  // TODO: ADD GAP FOR: 41-44, 45-48, 49-52, 53-56, 57-60

  const widthOffset = boothSize === 4 ? 4 : 0;

  return {
    x:
      baseX -
      boothNumberOffsetX -
      boothSubLetterOffsetX -
      boothSizeOffsetX -
      firstOffsetXGap -
      secondOffsetXGap -
      thirdOffsetXGap -
      fourthOffsetXGap -
      fifthOffsetXGap -
      sixthOffsetXGap -
      seventhOffsetXGap -
      eightOffsetXGap -
      ninthOffsetXGap,
    y: baseY,
    direction: 'HORIZONTAL',
    height: 40,
    width: 19 * boothSize + widthOffset
  };
}

const BOOTH_AA_SIZE = 42;
const BOOTH_Ax_WIDTH = 42;
const BOOTH_Ax_HEIGHT = 46;
const BOOTH_Ax_FIRST_GAP_X_CHAR_CODE = 'B'.charCodeAt(0);
const BOOTH_Ax_SECOND_GAP_X_CHAR_CODE = 'E'.charCodeAt(0);

function calculateAxBoothRect(parsedCircleCode: ParsedLargeCircleCode): BoothRect {
  const baseX = 5877;
  const baseY = 2820;

  const boothLetter = parsedCircleCode.boothLetter;
  const lastLetterCode = boothLetter.charCodeAt(1);

  const isHorizontal =
    (parsedCircleCode.boothStartNumber === 26 ||
      parsedCircleCode.boothStartNumber === 20 ||
      parsedCircleCode.boothStartNumber === 13 ||
      parsedCircleCode.boothStartNumber === 6) &&
    parsedCircleCode.boothSize === 2;
  const isUpwards = parsedCircleCode.boothStartNumber <= 26;

  // ############## X OFFSET #################
  const numberOffsetX =
    ((parsedCircleCode.boothStartNumber / 27) | 0) * BOOTH_Ax_WIDTH + 5;

  const sizeOffsetX = isHorizontal
    ? BOOTH_Ax_WIDTH * (parsedCircleCode.boothSize - 1)
    : 0;

  // gap until Ae
  const boothLetterFirstDiffX = lastLetterCode - BOOTH_Ax_FIRST_GAP_X_CHAR_CODE;
  const boothLetterFirstOffsetX = Math.min(boothLetterFirstDiffX, 3) * 150 + 5;

  // gap until Af
  const boothLetterSecondOffsetX =
    Math.min(Math.max(lastLetterCode - BOOTH_Ax_SECOND_GAP_X_CHAR_CODE, 0), 1) * 198;

  // gap until AG
  const boothLetterThirdOffsetX = boothLetter === 'AG' ? 150 : 0;

  // TODO: handle gap until AH

  // ############## Y OFFSET #################
  const columnIndex = isUpwards
    ? parsedCircleCode.boothStartNumber - 1
    : 52 - parsedCircleCode.boothStartNumber;

  const numberOffsetY = BOOTH_Ax_HEIGHT * columnIndex;

  /**
   * offset for size ex: a circle with 2 booths AB-01/AB-02
   * boothStartNumber is 1,
   * size is 2
   * Y coord of the booth should start at AB-02 instead of AB-02
   * there are no booths that has a size > 1 horizontally so it's fine for now
   */
  const sizeOffsetY =
    isHorizontal || !isUpwards ? 0 : BOOTH_Ax_HEIGHT * (parsedCircleCode.boothSize - 1);

  const firstGapOffsetY =
    parsedCircleCode.boothStartNumber > 6 && parsedCircleCode.boothStartNumber < 47
      ? 98
      : 0;
  const secondGapOffetY =
    parsedCircleCode.boothStartNumber > 13 && parsedCircleCode.boothStartNumber < 40
      ? 266
      : 0;
  const thirdGapOffsetY =
    parsedCircleCode.boothStartNumber > 20 && parsedCircleCode.boothStartNumber < 33
      ? 97
      : 0;

  return {
    height: isHorizontal ? BOOTH_Ax_HEIGHT : parsedCircleCode.boothSize * BOOTH_Ax_HEIGHT,
    width: isHorizontal ? parsedCircleCode.boothSize * BOOTH_Ax_WIDTH : BOOTH_Ax_WIDTH,
    direction: isHorizontal ? 'HORIZONTAL' : 'VERTICAL',
    x:
      baseX -
      numberOffsetX -
      sizeOffsetX -
      boothLetterFirstOffsetX -
      boothLetterSecondOffsetX -
      boothLetterThirdOffsetX,
    y:
      baseY -
      numberOffsetY -
      sizeOffsetY -
      firstGapOffsetY -
      secondGapOffetY -
      thirdGapOffsetY
  };
}

function calculateAABoothRect(parsedCircleCode: ParsedLargeCircleCode): BoothRect {
  // base coords
  let baseX = 5910;
  let baseY = 3011;
  let numberOffset = 1;

  if (parsedCircleCode.boothStartNumber >= 16) {
    baseX = 6224;
    baseY = 1020;
    numberOffset = 11;
  }

  const sizeOffset = (parsedCircleCode.boothSize - 1) * BOOTH_AA_SIZE;
  const startNumberOffset =
    (parsedCircleCode.boothStartNumber - numberOffset) * BOOTH_AA_SIZE;

  const firstSpaceOffset =
    parsedCircleCode.boothStartNumber >= 12 && parsedCircleCode.boothStartNumber < 16
      ? 384
      : 0;
  const secondSpaceOffset = parsedCircleCode.boothStartNumber >= 19 ? 845 : 0;

  return {
    height: BOOTH_AA_SIZE,
    width: BOOTH_AA_SIZE * parsedCircleCode.boothSize,
    direction: 'HORIZONTAL',
    x: baseX - sizeOffset - startNumberOffset - firstSpaceOffset - secondSpaceOffset,
    y: baseY
  };
}

function normalizeWorkTypes(rawCircle: RawCircle): string[] {
  const workTypes: string[] = [];

  if (rawCircle.SellsArtbook) {
    workTypes.push('artbook');
  }

  if (rawCircle.SellsComic) {
    workTypes.push('comic');
  }

  if (rawCircle.SellsCommision) {
    workTypes.push('commision');
  }

  if (rawCircle.SellsGame) {
    workTypes.push('game');
  }

  if (rawCircle.SellsGoods) {
    workTypes.push('goods');
  }

  if (rawCircle.SellsHandmadeCrafts) {
    workTypes.push('handmade crafts');
  }

  if (rawCircle.SellsMagazine) {
    workTypes.push('magazine');
  }

  if (rawCircle.SellsMusic) {
    workTypes.push('music');
  }

  if (rawCircle.SellsPhotobookCosplay) {
    workTypes.push('photobook cosplay');
  }

  if (rawCircle.SellsPhotobookGeneral) {
    workTypes.push('photobook general');
  }

  return workTypes;
}

function normalizeSocialMedia(rawCircle: RawCircle): SocialMediaDetail[] {
  const socialMediaDetails: SocialMediaDetail[] = [];

  if (rawCircle.circle_facebook) {
    socialMediaDetails.push({
      kind: 'FACEBOOK',
      url: normalizeExternalUrl(rawCircle.circle_facebook)
    });
  }

  if (rawCircle.circle_instagram) {
    socialMediaDetails.push({
      kind: 'INSTAGRAM',
      url: normalizeExternalUrl(rawCircle.circle_instagram)
    });
  }

  if (rawCircle.circle_twitter) {
    socialMediaDetails.push({
      kind: 'TWITTER',
      url: normalizeExternalUrl(rawCircle.circle_twitter)
    });
  }

  if (rawCircle.circle_other_socials) {
    socialMediaDetails.push({
      kind: 'OTHER',
      url: normalizeExternalUrl(rawCircle.circle_other_socials)
    });
  }

  return socialMediaDetails;
}

function normalizeFandoms(fandoms: string, otherFandoms: string): string[] {
  const normalizedOtherFandoms = otherFandoms.trim() === '-' ? '' : otherFandoms;
  const allFandoms = fandoms
    .split(FANDOM_SPLIT_PATTERN)
    .concat(normalizedOtherFandoms.split(FANDOM_SPLIT_PATTERN))
    .filter(Boolean)
    .map((f) => f.trim().toLowerCase().replace(/\s+/g, ' '));

  return [...new Set(allFandoms)];
}

function normalizeDay(day: RawDay): AttendingDay[] {
  if (day === 'Both Days') {
    return ['SAT', 'SUN'];
  }

  if (day === 'SAT') {
    return ['SAT'];
  }

  return ['SUN'];
}

function normalizeRawCircleType(rawCircleType: RawCircleType): CircleType {
  return rawCircleType
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('(S)', '') as CircleType;
}

function normalizeCircleCode(rawCode: string): string {
  return rawCode.split(' ')[0]!.replaceAll('/u002', '/').trim();
}

export function normalizeExternalUrl(url: string): string {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // Checks if the url starts with http:// or https:// or //
  const hasProtocol = /^(https?:)?\/\//i.test(trimmedUrl);

  if (hasProtocol) {
    return trimmedUrl;
  }

  // Prepend https:// for absolute external routing
  return `https://${trimmedUrl}`;
}

function isLargeParsedCircleCode(
  parsedCircleCode: ParsedCircleCode
): parsedCircleCode is ParsedLargeCircleCode {
  return isLargeCircle(parsedCircleCode.circleType);
}

function isDefaultParsedCircleCode(
  parsedCircleCode: ParsedCircleCode
): parsedCircleCode is ParsedDefaultCircleCode {
  return isDefaultCircle(parsedCircleCode.circleType);
}
