# Виртуальная студия OSTAP DOTCENKO - GTT — ассеты и промпты

Все генерации — Higgsfield. Сохрани эти промпты: по ним можно перегенерировать
студию (другой ракурс, сезон, время суток), сохранив стиль.

## Готовые файлы (скачай и положи в remotion/public/studio/)

| Файл | Что это | Ссылка |
|---|---|---|
| night.png | Ночь, осветлённая, надпись OSTAP DOTCENKO - GTT, 2K | https://d8j0ntlcm91z4.cloudfront.net/user_3HTmZ9Q90B4oeOLXfgRPKEYZbAe/hf_20260924_115755_05da62b8-666b-4b6d-8917-b8bb2491f5c6.png |
| morning.png | Утро, тот же кабинет, 2K | https://d8j0ntlcm91z4.cloudfront.net/user_3HTmZ9Q90B4oeOLXfgRPKEYZbAe/hf_20260924_120356_3069dc55-f5d9-4573-88c6-3e52ceb8b94a.png |
| night.mp4 | Ночной луп, 8 с, 1080p | https://d8j0ntlcm91z4.cloudfront.net/user_3HTmZ9Q90B4oeOLXfgRPKEYZbAe/hf_20260924_120425_e38f7bbe-7fa2-4ffd-bb8e-d1330a3a29cc.mp4 |
| morning.mp4 | Утренний луп, 8 с, 1080p | https://d8j0ntlcm91z4.cloudfront.net/user_3HTmZ9Q90B4oeOLXfgRPKEYZbAe/hf_20260924_120840_8e77d138-eb7b-47cb-99cb-46d3b3eb6597.mp4 |

Ссылки ведут на хранилище Higgsfield — скачай файлы к себе, не полагайся на ссылки долгосрочно.

## 1. Базовый кадр (GPT Image 2.5, 9:16)

```
Photorealistic vertical 9:16 background plate for a talking-head video, EMPTY room, no people.
A modern premium executive office at night high up in a Shanghai skyscraper. Behind: floor-to-ceiling
window showing the Lujiazui skyline at night (Shanghai Tower, Oriental Pearl Tower, glowing city lights
reflecting on the Huangpu river), softly out of focus with beautiful bokeh. Left side: dark walnut wood
wall panel with a brushed-brass 3D letter logo reading exactly "OSTAP DOTCENKO - GTT", subtle warm
backlight halo behind the letters, placed in the upper-left part of the frame, legible. Warm practical
lighting: two tall floor lamps with linen shades glowing warm 2700K, a low shelf with books and a small
bonsai, leather armchair edge. The center of the frame is open empty space where a person will later be
composited (seated at eye level). Bottom of frame: edge of a dark wood desk. Camera at seated eye height,
35mm lens, shallow depth of field, background 1.5-2 stops darker than foreground, cinematic warm and teal
color grade, moody, luxurious, high detail, realistic, no other text.
```
Настройки: quality high, resolution 2k.

## 2. Правка: надпись + яркость (референс = базовый кадр)

```
Edit this exact image, keep the same room, composition, furniture, window, Shanghai night skyline and
camera angle unchanged. Two changes only: 1) Replace the brass wall logo text so it reads exactly
"OSTAP DOTCENKO - GTT" in the same brushed-brass 3D letter style, same position and size, correctly
spelled, clean even letters. 2) Make the whole image noticeably brighter: lift exposure by about one stop,
brighten shadows and the interior, warmer and more light from the floor lamps, the room clearly visible,
while keeping the night city view outside and the cinematic warm mood. No people, no other text.
```

## 3. Утренняя версия (референс = night.png)

```
Edit this exact image: keep the same room, composition, furniture, lamps, desk, wall and the brass logo
text "OSTAP DOTCENKO - GTT" exactly as it is, same camera angle. Change only the time of day: early bright
morning instead of night. Through the floor-to-ceiling window the Shanghai Lujiazui skyline (Shanghai
Tower, Oriental Pearl Tower, Huangpu river) in soft golden morning sunlight with light haze and a pale
blue sky. Natural daylight fills the office, soft warm sun rays, floor lamps still glowing gently. Fresh,
bright, premium business atmosphere. No people, no other text.
```

## 4. Живые лупы (FLUX 3 Video, 8 с, 1080p, без звука, start_image = end_image = кадр)

Ночь:
```
Seamless ambient loop of this exact office interior. Locked-off static camera, absolutely no camera
movement, no zoom. The room, furniture, lamps, desk and the brass wall logo stay perfectly still and
unchanged. Only the view through the window is alive: the Shanghai night skyline with gently twinkling
city lights, slowly blinking red aviation lights on skyscraper tops, soft LED facade animations, tiny boats
drifting slowly on the Huangpu river, faint moving car lights far below. Floor lamps glow steadily.
Subtle, calm, realistic. No people, no text changes.
```
Утро:
```
Seamless ambient loop of this exact office interior in the morning. Locked-off static camera, absolutely
no camera movement, no zoom. The room, furniture, lamps, desk and the brass wall logo stay perfectly still
and unchanged. Only the view through the window is alive: the Shanghai skyline in soft morning sun, clouds
drifting slowly across the sky, gentle sunlight glints on glass skyscrapers, small boats moving slowly on
the Huangpu river, faint traffic far below, light haze shifting. Subtle, calm, realistic. No people, no
text changes.
```
Приём: одинаковый первый и последний кадр → луп зацикливается; в Remotion стык дополнительно
закрыт кроссфейдом 0,6 с, а интерьер берётся из PNG — двигается только окно.

## 5. Новые варианты студии (шаблон промпта)

```
Edit this exact image: keep the same room, composition, furniture, lamps, desk, wall and the brass logo
text "OSTAP DOTCENKO - GTT" exactly as it is, same camera angle. Change only: [ВРЕМЯ СУТОК / ПОГОДА /
СЕЗОН — например "golden sunset", "light rain on the window glass", "Chinese New Year red lanterns
visible in the city"]. No people, no other text.
```
Идеи для серий: закат (вечерние ролики), дождь на стекле (спокойная аналитика), Китайский Новый год
и Double 11 (сезонный контент), вторая камера — крупный план у стола (outpaint/кроп из 2K-кадра).
