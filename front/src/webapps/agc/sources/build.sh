emcc -O2 -s WASM=1 -s EXPORTED_FUNCTIONS=_free -s EXPORTED_RUNTIME_METHODS=cwrap,getValue,setValue --no-entry agc_engine.c agc_engine_init.c agc_utilities.c ringbuffer.c ringbuffer_api.c wasm.c -o ../assets/agc.js

