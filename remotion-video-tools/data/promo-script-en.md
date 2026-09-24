# Promo voiceover — English

Английская версия текста из `data/promo-script.md`. Сцены и их порядок те же,
поэтому запись ложится на ту же сборку `GTT-SitePromo` без пересборки монтажа.

## Текст целиком

> A business expedition isn't just a work trip. It's a real adventure.
>
> And it starts with one question: which industry do you need. There are
> eighteen — and behind each one, over a thousand companies, with direct
> access to their leadership.
>
> From there it's simple: twenty programmes are already built, one for every
> country from China to the UAE. Each route is planned down to the detail —
> cities, days, companies. Every day is scheduled by the hour, so you know in
> advance where you'll be and who you're meeting.
>
> How it goes — the people who've already been will tell you. And if you need
> to go deeper, we run exclusive training inside the campuses of Alibaba,
> Huawei, ByteDance and other top companies.
>
> See for yourself: globaltechtour dot ru.

## Разбивка по сценам

| Сцена | ~сек | Фраза |
| --- | --- | --- |
| Тетраэдр | 0:00 | A business expedition isn't just a work trip. It's a real adventure. |
| Главная | 0:05 | And it starts with one question: which industry do you need. |
| Отрасли | 0:08 | There are eighteen — and behind each one, |
| Компании | 0:13 | over a thousand companies, with direct access to their leadership. |
| Программы | 0:18 | From there it's simple: twenty programmes are already built, one for every country from China to the UAE. |
| Карта | 0:23 | Each route is planned down to the detail — cities, days, companies. |
| Программа | 0:30 | Every day is scheduled by the hour, so you know in advance where you'll be and who you're meeting. |
| Кейсы | 0:35 | How it goes — the people who've already been will tell you. |
| Обучение | 0:37 | And if you need to go deeper, we run exclusive training inside the campuses of Alibaba, Huawei, ByteDance and other top companies. |
| Финал | 0:42 | See for yourself: globaltechtour dot ru. |

## Чем перевод отличается от подстрочника

**Разрыв фразы между сценами сохранён.** «There are eighteen — and behind each
one,» кончается на одной сцене, «over a thousand companies» начинается на
следующей. Это тот же приём, что и в русской версии: незакрытое предложение
тянет зрителя через склейку.

**Длина подогнана под хронометраж, а не под русский текст.** Английская речь
идёт примерно 2,6 слова в секунду, русская — 2,2. Дословный перевод русских
95 слов дал бы 120 английских и вылез бы за 45 с. В тексте 108 слов — это
те же ~42 с речи, что и в русской записи.

**«глобалтектур точка ру» → «globaltechtour dot ru».** Побуквенно домен
синтез читает как аббревиатуру; «dot ru» вслух — единственный вариант, который
звучит как адрес, а не как список букв.

**Числа словами** («eighteen», «twenty», «over a thousand») — по той же
причине, что и в русской версии: в кадре стоят цифры, в речи слова.

## Что нужно для записи голосом владельца

Английская дорожка его голосом требует клона голоса — см. раздел «Клонирование»
в `docs/voice.md`. Синтез с библиотечным голосом лежит в `out/tts/` и годится
только как проба темпа: тембр там чужой.
