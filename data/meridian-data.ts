// 経絡（けいらく）データ
export type MeridianKey = 
  | 'GV' | 'CV' // 督脈・任脈
  | 'LU' | 'LI' | 'ST' | 'SP' // 肺経・大腸経・胃経・脾経
  | 'HT' | 'SI' | 'BL' | 'KI' // 心経・小腸経・膀胱経・腎経
  | 'PC' | 'TE' | 'GB' | 'LR'; // 心包経・三焦経・胆経・肝経

export interface Meridian {
  key: MeridianKey;
  name: string;
  reading: string;
  shortName: string;
  count: number;
  description: string;
}

export const MERIDIANS: Record<MeridianKey, Meridian> = {
  // 奇経八脈（督脈・任脈）
  GV: { key: 'GV', name: '督脈', reading: 'とくみゃく', shortName: '督', count: 28, description: '背中の正中線を走る経絡' },
  CV: { key: 'CV', name: '任脈', reading: 'にんみゃく', shortName: '任', count: 24, description: 'お腹の正中線を走る経絡' },
  // 手の経絡（6経）
  LU: { key: 'LU', name: '手太陰肺経', reading: 'てたいいんはいけい', shortName: '肺', count: 11, description: '胸から手の親指に至る経絡' },
  LI: { key: 'LI', name: '手陽明大腸経', reading: 'てようめいだいちょうけい', shortName: '大腸', count: 20, description: '手の人差し指から顔に至る経絡' },
  HT: { key: 'HT', name: '手少陰心経', reading: 'てしょういんしんけい', shortName: '心', count: 9, description: '胸から手の小指に至る経絡' },
  SI: { key: 'SI', name: '手太陽小腸経', reading: 'てたいようしょうちょうけい', shortName: '小腸', count: 19, description: '手の小指から顔に至る経絡' },
  PC: { key: 'PC', name: '手厥陰心包経', reading: 'てけついんしんぽうけい', shortName: '心包', count: 9, description: '胸から手の中指に至る経絡' },
  TE: { key: 'TE', name: '手少陽三焦経', reading: 'てしょうようさんしょうけい', shortName: '三焦', count: 23, description: '手の薬指から顔に至る経絡' },
  // 足の経絡（6経）
  ST: { key: 'ST', name: '足陽明胃経', reading: 'あしようめいいけい', shortName: '胃', count: 45, description: '顔から足の第2趾に至る経絡' },
  SP: { key: 'SP', name: '足太陰脾経', reading: 'あしたいいんひけい', shortName: '脾', count: 21, description: '足の親指から胸に至る経絡' },
  BL: { key: 'BL', name: '足太陽膀胱経', reading: 'あしたいようぼうこうけい', shortName: '膀胱', count: 67, description: '目から足の小趾に至る経絡' },
  KI: { key: 'KI', name: '足少陰腎経', reading: 'あししょういんじんけい', shortName: '腎', count: 27, description: '足の裏から胸に至る経絡' },
  GB: { key: 'GB', name: '足少陽胆経', reading: 'あししょうようたんけい', shortName: '胆', count: 44, description: '目から足の第4趾に至る経絡' },
  LR: { key: 'LR', name: '足厥陰肝経', reading: 'あしけついんかんけい', shortName: '肝', count: 14, description: '足の親指から胸に至る経絡' },
};

// 経絡キーの配列（表示順）: 督脈→任脈→肺→大腸→胃→脾→心→小腸→膀胱→腎→心包→三焦→胆→肝
export const MERIDIAN_ORDER: MeridianKey[] = [
  'GV', 'CV', 'LU', 'LI', 'ST', 'SP', 'HT', 'SI', 'BL', 'KI', 'PC', 'TE', 'GB', 'LR'
];

// ツボIDから経絡キーを取得
export function getMeridianKeyFromId(id: string): MeridianKey | null {
  const prefix = id.replace(/[0-9]/g, '');
  if (prefix in MERIDIANS) {
    return prefix as MeridianKey;
  }
  return null;
}

// 経絡キーでツボをフィルタリング
export function filterTsuboByMeridian<T extends { id: string }>(tsuboList: T[], meridianKey: MeridianKey): T[] {
  return tsuboList.filter(tsubo => getMeridianKeyFromId(tsubo.id) === meridianKey);
}
