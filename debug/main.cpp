// https://gitlab.com/VladyslavUsenko/basalt-headers

/// @brief Uniform cummulative B-spline for SO(3) of order N
///
/// For example, in the particular case scalar values and order N=5, for a time
/// \f$t \in [t_i, t_{i+1})\f$ the value of \f$p(t)\f$ depends only on 5 control
/// points at \f$[t_i, t_{i+1}, t_{i+2}, t_{i+3}, t_{i+4}]\f$. To
/// simplify calculations we transform time to uniform representation \f$s(t) =
/// (t - t_0)/\Delta t \f$, such that control points transform into \f$ s_i \in
/// [0,..,N] \f$. We define function \f$ u(t) = s(t)-s_i \f$ to be a time since
/// the start of the segment. Following the cummulative matrix representation of
/// De Boor - Cox formula, the value of the function can be evaluated as
/// follows: \f{align}{
///    R(u(t)) &= R_i
///    \prod_{j=1}^{4}{\exp(k_{j}\log{(R_{i+j-1}^{-1}R_{i+j})})},
///    \\ \begin{pmatrix} k_0 \\ k_1 \\ k_2 \\ k_3 \\ k_4 \end{pmatrix}^T &=
///    M_{c5} \begin{pmatrix} 1 \\ u \\ u^2 \\ u^3 \\ u^4
///    \end{pmatrix},
/// \f}
/// where \f$ R_{i} \in SO(3) \f$ are knots and \f$ M_{c5} \f$ is a cummulative
/// blending matrix computed using \ref computeBlendingMatrix \f{align}{
///    M_{c5} = \frac{1}{4!}
///    \begin{pmatrix} 24 & 0 & 0 & 0 & 0 \\ 23 & 4 & -6 & 4 & -1 \\ 12 & 16 & 0
///    & -8 & 3 \\ 1 & 4 & 6 & 4 & -3 \\ 0 & 0 & 0 & 0 & 1 \end{pmatrix}.
/// \f}

/**
 * @brief Uniform cummulative B-spline for SO(3) of order N
 *
 * For example, in the particular case scalar values and order N=5, for a time
 * \f$t \in [t_i, t_{i+1})\f$ the value of \f$p(t)\f$ depends only on 5 control
 * points at \f$[t_i, t_{i+1}, t_{i+2}, t_{i+3}, t_{i+4}]\f$. To
 * simplify calculations we transform time to uniform representation \f$s(t) =
 * (t - t_0)/\Delta t \f$, such that control points transform into \f$ s_i \in
 * [0,..,N] \f$. We define function \f$ u(t) = s(t)-s_i \f$ to be a time since
 * the start of the segment. Following the cummulative matrix representation of
 * De Boor - Cox formula, the value of the function can be evaluated as
 * follows: \f{align}{
 *    R(u(t)) &= R_i
 *    \prod_{j=1}^{4}{\exp(k_{j}\log{(R_{i+j-1}^{-1}R_{i+j})})},
 *    \\ \begin{pmatrix} k_0 \\ k_1 \\ k_2 \\ k_3 \\ k_4 \end{pmatrix}^T &=
 *    M_{c5} \begin{pmatrix} 1 \\ u \\ u^2 \\ u^3 \\ u^4
 *    \end{pmatrix},
 * \f}
 * where \f$ R_{i} \in SO(3) \f$ are knots and \f$ M_{c5} \f$ is a cummulative
 * blending matrix computed using \ref computeBlendingMatrix \f{align}{
 *    M_{c5} = \frac{1}{4!}
 *    \begin{pmatrix} 24 & 0 & 0 & 0 & 0 \\ 23 & 4 & -6 & 4 & -1 \\ 12 & 16 & 0
 *    & -8 & 3 \\ 1 & 4 & 6 & 4 & -3 \\ 0 & 0 & 0 & 0 & 1 \end{pmatrix}.
 * \f}
 */
