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
/// With linear approximation of the spline coefficient evolution over time
/// \f$ k_1(t_0 + \Delta t) = k_1(t_0) + k_1'(t_0)\Delta t \f$ we can write
/// \f{align}
///  R(t_0 + \Delta t) &= R_i \exp( (k_1(t_0) + k_1'(t_0) \Delta t) ~ d_1)
///  \exp((k_2(t_0) + k_2'(t_0) \Delta t) ~ d_2)
///  \\ &= R_i \exp(k_1(t_0) ~ d_1) \exp(k_1'(t_0)~ d_1 \Delta t )
///  \exp(k_2(t_0) ~ d_2) \exp(k_2'(t_0) ~ d_2 \Delta t )
///  \\ &= R_i \exp(k_1(t_0) ~ d_1)
///  \exp(k_2(t_0) ~ d_2) \exp(R_{a}^T k_1'(t_0)~ d_1 \Delta t )
///  \exp(k_2'(t_0) ~ d_2 \Delta t )
///  \\ &= R_i \exp(k_1(t_0) ~ d_1)
///  \exp(k_2(t_0) ~ d_2) \exp((R_{a}^T k_1'(t_0)~ d_1 +
///  k_2'(t_0) ~ d_2) \Delta t )
///  \\ &= R(t_0) \exp((R_{a}^T k_1'(t_0)~ d_1 +
///  k_2'(t_0) ~ d_2) \Delta t )
///  \\ &= R(t_0) \exp( \omega \Delta t ),
/// \f} where \f$ \Delta t \f$ is small, \f$ R_{a} \in SO(3) = \exp(k_2(t_0) ~
/// d_2) \f$ and \f$ \omega \f$ is the rotational velocity in the body frame.
/// More explicitly we have the formula for rotational velocity in the body
/// frame \f[ \omega = R_{a}^T k_1'(t_0)~ d_1 +  k_2'(t_0) ~ d_2. \f]
/// Derivatives of spline coefficients can be computed with \ref
/// baseCoeffsWithTime similar to \ref RdSpline (detailed description). With
/// the recursive formula computations generalize to different orders of
/// spline N.