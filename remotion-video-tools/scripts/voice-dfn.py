# Шумоподавление голоса DeepFilterNet3 — локально, без отправки звука наружу.
#   python3 scripts/voice-dfn.py <in.wav> <out.wav> [папка с моделью DeepFilterNet3] [проходов=1]
# Два прохода с пост-фильтром — для съёмки в кафе: пила, посуда, чужие голоса на фоне.
# Модель: https://raw.githubusercontent.com/Rikorose/DeepFilterNet/main/models/DeepFilterNet3.zip (распаковать).
# В отличие от Resemble denoise не «дорисовывает» голос: нет хрипа и металла, фон в паузах тише.
import sys, torch, torchaudio, soundfile as sf
from df.enhance import enhance, init_df
src, dst = sys.argv[1], sys.argv[2]
base = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
passes = int(sys.argv[4]) if len(sys.argv) > 4 else 1
model, st, _ = init_df(model_base_dir=base, log_level='ERROR') if base else init_df(log_level='ERROR')
x, sr = sf.read(src, dtype='float32')
if x.ndim > 1: x = x.mean(1)
w = torch.from_numpy(x)[None]
if sr != st.sr(): w = torchaudio.functional.resample(w, sr, st.sr())
# по кускам в 30 с, чтобы не держать весь ролик в памяти
y = w
for _ in range(passes):
    out = []
    step = st.sr() * 30
    for i in range(0, y.shape[1], step):
        out.append(enhance(model, st, y[:, i:i + step], pad=True).squeeze(0))
    y = torch.cat(out)[None]
y = y.squeeze(0)
if sr != st.sr(): y = torchaudio.functional.resample(y[None], st.sr(), sr).squeeze(0)
sf.write(dst, y.numpy(), sr); print('✔', dst, round(len(y) / sr, 2), 'с')
