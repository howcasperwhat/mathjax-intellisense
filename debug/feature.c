#include <complex.h>
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/**
 * @brief Euler's identity
 * \f$ e^{i\pi} + 1 = 0 \f$
 */
double complex euler_identity()
{
    double complex result = cexp(I * M_PI) + 1.0;
    return result;
}

/// @brief Zeta Function: It is defined as below: \f[
/// \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
/// \f]
double zeta_function()
{
    double result = M_PI * M_PI / 6.0;
    return result;
}
