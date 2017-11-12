#!/bin/bash -ex

emcc wasm/world-wrapper.cpp wasm/VCLib/src/VCLib.c wasm/World/src/*.cpp wasm/SPTK/bin/fft/_fft.c wasm/SPTK/lib/getmem.c wasm/SPTK/lib/movem.c wasm/SPTK/lib/fillz.c wasm/SPTK/bin/mgcep/_mgcep.c wasm/SPTK/bin/mlsadf/_mlsadf.c wasm/SPTK/bin/b2mc/_b2mc.c wasm/SPTK/bin/gc2gc/_gc2gc.c wasm/SPTK/bin/gnorm/_gnorm.c wasm/SPTK/bin/ifftr/_ifftr.c wasm/SPTK/bin/fftr/_fftr.c  wasm/SPTK/bin/ifft/_ifft.c wasm/SPTK/bin/ignorm/_ignorm.c wasm/SPTK/bin/mc2b/_mc2b.c  wasm/SPTK/lib/theq.c \
-s WASM=1 \
-s "MODULARIZE=1" \
-Iwasm/World/src -Iwasm/SPTK/include -Iwasm/VCLib/include \
-s "EXPORTED_FUNCTIONS=['_GetF0Length', '_GetFFTSize', '_GetSpeechFeatures', '_GetSynthesisFormLength', '_GetSynthesisForm', '_SPTK_mgcep', '_SPTK_mlsadf']" \
-s "ALLOW_MEMORY_GROWTH=1" \
-o wasm/vclibweb.js && \
echo 'export default Module;' >> wasm/vclibweb.js