#include <stdlib.h>
#include "world/d4c.h"
#include "world/harvest.h"
#include "world/cheaptrick.h"
#include "world/synthesis.h"

extern "C" {

int GetF0Length(int x_length, int fs)
{
    return GetSamplesForHarvest(fs, x_length, 5.0);
}

int GetFFTSize(int fs)
{
    CheapTrickOption option = {0};
    InitializeCheapTrickOption(fs, &option);
    option.f0_floor = 71.0;
    return GetFFTSizeForCheapTrick(fs, &option);
}

void GetSpeechFeatures(const double* x, int x_length, int fs, double* f0, int f0_length, double* sp, double *ap, int fft_size)
{
    HarvestOption harvestOption = { 0 };
    InitializeHarvestOption(&harvestOption);

    harvestOption.frame_period = 5.0;
    harvestOption.f0_floor = 40.0;

    double* time_axis = new double[f0_length];

    Harvest(x, x_length, fs, &harvestOption, time_axis, f0);

    CheapTrickOption cheapOption = {0};
    InitializeCheapTrickOption(fs, &cheapOption);

    cheapOption.f0_floor = 71.0;
    cheapOption.fft_size = GetFFTSizeForCheapTrick(fs, &cheapOption);

    double** spectrogram = new double *[f0_length];
    for (int i = 0; i < f0_length; ++i)
      spectrogram[i] = &sp[i * (fft_size / 2 + 1)];

    CheapTrick(x, x_length, fs, time_axis, f0, f0_length, &cheapOption, spectrogram);

    delete[](spectrogram);

    D4COption d4cOption = {0};
    InitializeD4COption(&d4cOption);

    d4cOption.threshold = 0.85;

    double** aperiodicity = new double *[f0_length];
    for (int i = 0; i < f0_length; ++i)
      aperiodicity[i] = &ap[i * (fft_size / 2 + 1)];

    D4C(x, x_length, fs, time_axis, f0, f0_length, fft_size, &d4cOption, aperiodicity);

    delete[](aperiodicity);
}

int GetSynthesisFormLength(int f0_length, int fs)
{
    return static_cast<int>((f0_length - 1) * 5.0 / 1000.0 * fs) + 1;
}

void GetSynthesisForm(int fs, const double* f0, int f0_length, const double* sp, const double* ap, int fft_size, double* y, int y_length)
{
    double** spectrogram = new double*[f0_length];
    double** aperiodicity = new double*[f0_length];
    for (int i = 0; i < f0_length; i++)
    {
        spectrogram[i] = const_cast<double*>(&sp[i * (fft_size / 2 + 1)]);
        aperiodicity[i] = const_cast<double*>(&ap[i * (fft_size / 2 + 1)]);
    }

    Synthesis(f0, f0_length, spectrogram, aperiodicity, fft_size, 5.0, fs, y_length, y);

    delete[](spectrogram);
    delete[](aperiodicity);
}
}