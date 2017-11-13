import Module from '../wasm/vclibweb';

export default class VCLibWeb {
    static Initialize() {
        VCLibWeb.isInitialized = false;

        return new Promise((resolve, reject) => {
            fetch('../wasm/vclibweb.wasm')
            .then(response => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.arrayBuffer();
            })
            .then(buffer => new Uint8Array(buffer))
            .then(binary => {
                let moduleArgs = {
                    wasmBinary: binary,
                    onRuntimeInitialized: () => {
                        VCLibWeb.assignFunctions();
                        VCLibWeb.isInitialized = true;
                        resolve();
                    }
                };
                VCLibWeb.module = Module(moduleArgs);
            })
            .catch(err => {
                reject(err);
            });
        })
    }

    static assignFunctions() {
        if (VCLibWeb.isInitialized) return;

        VCLibWeb.functions = {};
        // int GetF0Length(int x_length, int fs)
        VCLibWeb.functions.GetF0Length = VCLibWeb.module.cwrap('GetF0Length', 'number', ['number', 'number']);
        // int GetFFTSize(int fs)
        VCLibWeb.functions.GetFFTSize = VCLibWeb.module.cwrap('GetFFTSize', 'number', ['number']);
        // void GetSpeechFeatures(const double* x, int x_length, int fs, double* f0, int f0_length, double* sp, double *ap, int fft_size)
        VCLibWeb.functions.GetSpeechFeatures = VCLibWeb.module.cwrap('GetSpeechFeatures', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
        // int GetSynthesisFormLength(int f0_length, int fs)
        VCLibWeb.functions.GetSynthesisFormLength = VCLibWeb.module.cwrap('GetSynthesisFormLength', 'number', ['number', 'number']);
        // void GetSynthesisForm(int fs, const double* f0, int f0_length, const double* sp, const double* ap, int fft_size, double* y, int y_length)
        VCLibWeb.functions.GetSynthesisForm = VCLibWeb.module.cwrap('GetSynthesisForm', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
        // void SPTK_mgcep(float *spectrum, int sp_length, double alpha, double gamma, int order, int fft_length, int itype, int otype, int min_iter, int max_iter, int recursions, double eps, double end_cond, int etype, double min_det, float *mcep)
        VCLibWeb.functions.mgcep = VCLibWeb.module.cwrap('SPTK_mgcep', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
        // int SPTK_mlsadf(float *wavform, int wavform_length, float *mcep, int mcep_length, int order, double alpha, int frame_period, int i_period, int pade, int is_transpose, int is_inverse, int is_coef_b, int is_without_gain, float *y)
        VCLibWeb.functions.mlsadf = VCLibWeb.module.cwrap('SPTK_mlsadf', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
    }

    static checkModuleEnabled() {
        return VCLibWeb.isInitialized && VCLibWeb.functions != undefined;
    }

    static GetF0Length(x_length, fs) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        return VCLibWeb.functions.GetF0Length(x_length, fs);
    }

    static GetFFTSize(fs) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        return VCLibWeb.functions.GetFFTSize(fs);
    }

    static GetSpeechFeatures(x, fs, f0_length, fft_size) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        if (f0_length === undefined) f0_length = VCLibWeb.GetF0Length(x.length, fs);
        if (fft_size === undefined) fft_size = VCLibWeb.GetFFTSize(fs);

        // X - input waveform
        let pointer_x = VCLibWeb.module._malloc(x.length * 8); // 64bit => 8byte
        let offset_x = pointer_x / 8;
        VCLibWeb.module.HEAPF64.set(x, offset_x);

        // F0
        let pointer_f0 = VCLibWeb.module._malloc(f0_length * 8);
        let offset_f0 = pointer_f0 / 8;

        // Spectrogram
        let pointer_sp = VCLibWeb.module._malloc((f0_length * (fft_size / 2 + 1)) * 8);
        let offset_sp = pointer_sp / 8;

        // F0
        let pointer_ap = VCLibWeb.module._malloc((f0_length * (fft_size / 2 + 1)) * 8);
        let offset_ap = pointer_ap / 8;

        VCLibWeb.functions.GetSpeechFeatures(pointer_x, x.length, fs, pointer_f0, f0_length, pointer_sp, pointer_ap, fft_size);

        // Heap to JS TypedArray
        let f0 = new Float64Array(VCLibWeb.module.HEAPF64.buffer, pointer_f0, f0_length);
        let sp = new Float64Array(VCLibWeb.module.HEAPF64.buffer, pointer_sp, f0_length * (fft_size / 2 + 1));
        let ap = new Float64Array(VCLibWeb.module.HEAPF64.buffer, pointer_ap, f0_length * (fft_size / 2 + 1));

        // Free memory
        VCLibWeb.module._free(pointer_x);
        VCLibWeb.module._free(pointer_f0);
        VCLibWeb.module._free(pointer_sp);
        VCLibWeb.module._free(pointer_ap);

        return {
            fs: fs,
            f0_length: f0_length,
            fft_size: fft_size,
            f0: f0,
            sp: sp,
            ap: ap
        };
    }

    static GetSynthesisFormLength(f0_length, fs) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        return VCLibWeb.functions.GetSynthesisFormLength(f0_length, fs);
    }

    static GetSynthesisForm(world_parameters) {

    }

    static mgcep(spectrum, options = GetDefaultOptionsForMgcep()) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        let f0_length = spectrum.length / (options.fft_length / 2 + 1);

        let sp = spectrum;

        // SP - input spectrum
        if (sp.BYTES_PER_ELEMENT !== 4)
        {
            sp = new Float32Array(spectrum);
        }
        let pointer_sp = VCLibWeb.module._malloc(sp.length * 4);
        let offset_sp = pointer_sp / 4;
        VCLibWeb.module.HEAPF32.set(sp, offset_sp);

        let pointer_mcep = VCLibWeb.module._malloc((f0_length * (options.order + 1)) * 4);
        let offset_mcep = pointer_mcep / 4;

        VCLibWeb.functions.mgcep(pointer_sp, sp.length, options.alpha, options.gamma, options.order, options.fft_length, options.itype, options.otype, options.min_iter, options.max_iter, options.recursions, options.eps, options.end_cond, options.etype, options.min_det, pointer_mcep)

        let mcep = new Float32Array(VCLibWeb.module.HEAPF32.buffer, pointer_mcep, f0_length * (options.order + 1));
        
        VCLibWeb.module._free(pointer_sp);
        VCLibWeb.module._free(pointer_mcep);

        return mcep;
    }

    static GetDefaultOptionsForMgcep() {
        return {
            alpha: 0.35,
            gamma: 0.0,
            order: 25,
            fft_length: 256,
            itype: 0,
            otype: 0,
            min_iter: 2,
            max_iter: 30,
            recursions: -1,
            eps: 0.0,
            end_cond: 0.001,
            etype: 0,
            min_det: 0.000001
        };
    }
    
    static mlsadf(wavform, mcep, options = GetDefaultOptionsForMlsadf()) {
        if (!VCLibWeb.checkModuleEnabled()) return null;
        let f0_length = mcep.length / (options.order + 1);

        let pointer_wavform = VCLibWeb.module._malloc(wavform.length * 4);
        let offset_wavform = pointer_wavform / 4;
        VCLibWeb.module.HEAPF32.set(wavform, offset_wavform);

        let pointer_mcep = VCLibWeb.module._malloc(mcep.length * 4);
        let offset_mcep = pointer_mcep / 4;
        VCLibWeb.module.HEAPF32.set(mcep, offset_mcep);

        let y_length = options.frame_period * mcep.length / (options.order + 1);

        let pointer_y = VCLibWeb.module._malloc(y_length * 4);
        let offset_y = pointer_y / 4;

        VCLibWeb.functions.mlsadf(pointer_wavform, wavform.length, pointer_mcep, mcep.length, options.order, options.alpha, options.frame_period, options.i_period, options.pade, options.is_transpose ? 1 : 0, options.is_inverse ? 1 : 0, options.is_coef_b ? 1 : 0, options.is_without_gain ? 1 : 0, pointer_y);

        let y = new Float32Array(VCLibWeb.module.HEAPF32.buffer, pointer_y, y_length * 4);
        
        VCLibWeb.module._free(pointer_wavform);
        VCLibWeb.module._free(pointer_mcep);
        VCLibWeb.module._free(pointer_y);

        return y;
    }

    static GetDefaultOptionsForMlsadf() {
        return {
            order: 25,
            alpha: 0.35,
            frame_period: 100,
            i_period: 1,
            pade: 4,
            is_transpose: false,
            is_inverse: false,
            is_coef_b: false,
            is_without_gain: false
        };
    }

    static UnnormalizeWebAudioBuffer(wavform) {
        for (let i = 0; i < wavform.length; i++)
            wavform[i] = wavform[i] * 32767.0;

        return new Float32Array(new Int16Array(wavform));
    }
}