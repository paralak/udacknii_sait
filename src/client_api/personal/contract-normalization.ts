// Стандартизация типов договоров (форм устройства на работу) из формы «Заполнить персонал».
// Коды из формы → человекочитаемые названия. Пустое → null (не указан).

export const FINAL_CONTRACT_TYPES: { code: string; name: string }[] = [
  { code: 'employment', name: 'Трудовой договор' },
  { code: 'patent', name: 'Патент' },
  { code: 'gph', name: 'ГПХ' },
  { code: 'internship', name: 'Стажировка' },
  { code: 'outsource', name: 'Аутсорс' },
];

const CODE_TO_NAME: Record<string, string> = FINAL_CONTRACT_TYPES.reduce((acc, t) => {
  acc[t.code] = t.name;
  return acc;
}, {} as Record<string, string>);

// Также распознаём русские варианты, если попадутся.
const ALIASES: Record<string, string> = {
  'трудовой': 'Трудовой договор',
  'трудовой договор': 'Трудовой договор',
  'патент': 'Патент',
  'гпх': 'ГПХ',
  'стажировка': 'Стажировка',
  'аутсорс': 'Аутсорс',
};

// code (из формы) → каноническое название договора, либо null если не распознан/пусто.
export function normalizeContractType(raw: string | null | undefined): string | null {
  const key = (raw || '').trim();
  if (!key) return null;
  if (CODE_TO_NAME[key]) return CODE_TO_NAME[key];
  const low = key.toLowerCase();
  return ALIASES[low] ?? null;
}
