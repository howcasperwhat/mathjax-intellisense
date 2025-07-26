#include <complex>

/**
 * @brief Euler's identity
 * \f$ e^{i\pi} + 1 = 0 \f$
 */
auto euler_identity()
{
    using com = std::complex<double>;
    com result = std::exp(com(0, 1) * M_PI) + 1.0;
    return result;
}

/// @brief Zeta Function: It is defined as below: \f[
/// \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
/// \f]
auto zeta_function()
{
    double result = M_PI * M_PI / 6.0;
    return result;
}
