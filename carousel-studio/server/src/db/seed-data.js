/**
 * Встроенные данные: три брендовых пресета и пять шаблонов карусели.
 *
 * ВАЖНО: шрифты, цвета и стиль изображений намеренно пустые. Их задаёт Остап —
 * код не выдумывает брендовые значения. Пресет со status: 'draft' считается
 * незаполненным: редактор возьмёт нейтральные дефолты и покажет предупреждение.
 */

export const BRAND_PRESETS = [
  {
    key: 'gtt',
    name: 'GTT (Global Tech Tour)',
    status: 'draft',
    fonts: {},
    colors: {},
    imageStyle: '',
    notes: 'Заполнить: шрифты (заголовок/текст), палитра, стиль изображений.',
    isBuiltin: true,
  },
  {
    key: 'aura_robotics',
    name: 'Aura Robotics',
    status: 'draft',
    fonts: {},
    colors: {},
    imageStyle: '',
    notes: 'Заполнить: шрифты (заголовок/текст), палитра, стиль изображений.',
    isBuiltin: true,
  },
  {
    key: 'ostapdotcenko',
    name: 'ostapdotcenko.ru',
    status: 'draft',
    fonts: {},
    colors: {},
    imageStyle: '',
    notes: 'Личный блог. Заполнить: шрифты (заголовок/текст), палитра, стиль изображений.',
    isBuiltin: true,
  },
];

/**
 * Базовая структура любой карусели из ТЗ:
 * хук → подтверждение → ценности → CTA.
 * intent каждого слота идёт в промпт ИИ на шаге 5.
 */
export const CAROUSEL_TEMPLATES = [
  {
    key: 'product_showcase',
    name: 'Презентация товара',
    contentType: 'product',
    description: 'Показать продукт: обещание → почему верить → три доказательства → условия → действие.',
    isBuiltin: true,
    structure: [
      { role: 'hook', hookType: null, intent: 'Останови скролл: результат, который даёт продукт, или боль, которую он снимает. Без названия компании.', fields: ['headline'] },
      { role: 'proof', hookType: null, intent: 'Причина листать дальше: что именно читатель узнает и почему это стоит его 30 секунд.', fields: ['headline', 'body'] },
      { role: 'value', hookType: 'comparison', intent: 'Ключевая возможность продукта против того, как задачу решают обычно.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'before_after', intent: 'Измеримая выгода: конкретная цифра, срок или экономия.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'case_study', intent: 'Короткий пример применения у реального типа клиента.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Условия: комплектация, сроки, что входит. Снять главное возражение.', fields: ['headline', 'body'] },
      { role: 'cta', hookType: null, intent: 'Одно конкретное действие: написать, оставить заявку, перейти по ссылке в профиле.', fields: ['headline', 'cta'] },
    ],
  },
  {
    key: 'before_after',
    name: 'До / после',
    contentType: 'before_after',
    description: 'Трансформация в цифрах: точка А → что сделали → точка Б.',
    isBuiltin: true,
    structure: [
      { role: 'hook', hookType: 'before_after', intent: 'Контраст в цифрах прямо на обложке: было X → стало Y.', fields: ['headline'] },
      { role: 'proof', hookType: null, intent: 'Кто герой истории и какая задача стояла. Почему этот результат достоверен.', fields: ['headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Точка А: как было. Конкретные потери, время, деньги.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Что именно изменили. Механика, а не лозунг.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'before_after', intent: 'Точка Б: как стало. Те же метрики, что в точке А, с цифрами.', fields: ['kicker', 'headline', 'body'] },
      { role: 'cta', hookType: null, intent: 'Предложить повторить результат у себя: одно действие.', fields: ['headline', 'cta'] },
    ],
  },
  {
    key: 'top5_facts',
    name: 'Топ-5 фактов',
    contentType: 'listicle',
    description: 'Пять неочевидных фактов по теме, каждый — отдельный слайд.',
    isBuiltin: true,
    structure: [
      { role: 'hook', hookType: 'hot_take', intent: 'Обещание списка + сильное утверждение: «5 фактов, после которых ты не будешь делать X».', fields: ['headline'] },
      { role: 'proof', hookType: null, intent: 'Откуда факты и почему им можно верить: опыт, данные, наблюдение.', fields: ['headline', 'body'] },
      { role: 'value', hookType: 'myth_reality', intent: 'Факт 1 — самый неочевидный. Формулировка + одно предложение объяснения.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Факт 2 с конкретной цифрой.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'comparison', intent: 'Факт 3 как сравнение: «так» против «вот так».', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Факт 4 — практический, применимый сразу.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'hot_take', intent: 'Факт 5 — самый спорный, на котором хочется поспорить в комментариях.', fields: ['kicker', 'headline', 'body'] },
      { role: 'cta', hookType: null, intent: 'Позвать в комментарии или подписаться: одно действие.', fields: ['headline', 'cta'] },
    ],
  },
  {
    key: 'case_study',
    name: 'Разбор кейса',
    contentType: 'case_study',
    description: 'Реальный пример с разбором: результат → контекст → что делали → цифры → принцип.',
    isBuiltin: true,
    structure: [
      { role: 'hook', hookType: 'case_study', intent: 'Результат кейса на обложке, без раскрытия способа.', fields: ['headline'] },
      { role: 'proof', hookType: null, intent: 'Кто клиент, в какой нише, с какой задачей пришёл.', fields: ['headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Исходная ситуация и главное ограничение.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Что сделали: конкретные шаги, а не абстракции.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'before_after', intent: 'Результат в цифрах и за какой срок.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Принцип, который переносится на другие случаи. Главная мысль карусели.', fields: ['kicker', 'headline', 'body'] },
      { role: 'cta', hookType: null, intent: 'Предложить разобрать задачу читателя: одно действие.', fields: ['headline', 'cta'] },
    ],
  },
  {
    key: 'myths_vs_reality',
    name: 'Мифы vs реальность',
    contentType: 'myths',
    description: 'Разбор трёх заблуждений по схеме «нужно не X, а Y».',
    isBuiltin: true,
    structure: [
      { role: 'hook', hookType: 'myth_reality', intent: 'Главный миф ниши одной фразой: «нужно не X, а Y».', fields: ['headline'] },
      { role: 'proof', hookType: null, intent: 'Почему миф живуч и чем он обходится тем, кто в него верит.', fields: ['headline', 'body'] },
      { role: 'value', hookType: 'myth_reality', intent: 'Миф 1 → реальность. Формулировка мифа, затем как на самом деле.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'myth_reality', intent: 'Миф 2 → реальность, с цифрой или примером.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: 'myth_reality', intent: 'Миф 3 → реальность, самый контринтуитивный.', fields: ['kicker', 'headline', 'body'] },
      { role: 'value', hookType: null, intent: 'Что делать вместо: короткий практический алгоритм.', fields: ['kicker', 'headline', 'body'] },
      { role: 'cta', hookType: null, intent: 'Позвать обсудить или забрать разбор: одно действие.', fields: ['headline', 'cta'] },
    ],
  },
];
