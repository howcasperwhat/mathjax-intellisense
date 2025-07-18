# Thanks to zhouzq-thu for offering these examples
# https://github.com/howcasperwhat/comment-formula/issues/25

# For example, in the particular case scalar values and order N=5, for a time
# $$t \in [t_i, t_{i+1})$$ the value of $$p(t)$$ depends only on 5 control
# points at $$[t_i, t_{i+1}, t_{i+2}, t_{i+3}, t_{i+4}]$$. To
# simplify calculations we transform time to uniform representation $$s(t) =
# (t - t_0)/\Delta t $$, such that control points transform into $$ s_i \in
# [0,..,N] $$. We define function $$ u(t) = s(t)-s_i $$ to be a time since
# the start of the segment. Following the cummulative matrix representation of
# De Boor - Cox formula, the value of the function can be evaluated as
# follows: $$\begin{align}
#    R(u(t)) &= R_i
#    \prod_{j=1}^{4}{\exp(k_{j}\log{(R_{i+j-1}^{-1}R_{i+j})})},
#    \\ \begin{pmatrix} k_0 \\ k_1 \\ k_2 \\ k_3 \\ k_4 \end{pmatrix}^T &=
#    M_{c5} \begin{pmatrix} 1 \\ u \\ u^2 \\ u^3 \\ u^4
#    \end{pmatrix},
# \end{align}$$
# where $$ R_{i} \in SO(3) $$ are knots and $$ M_{c5} $$ is a cummulative
# blending matrix computed using \ref computeBlendingMatrix $$\begin{align}
#    M_{c5} = \frac{1}{4!}
#    \begin{pmatrix} 24 & 0 & 0 & 0 & 0 \\ 23 & 4 & -6 & 4 & -1 \\ 12 & 16 & 0
#    & -8 & 3 \\ 1 & 4 & 6 & 4 & -3 \\ 0 & 0 & 0 & 0 & 1 \end{pmatrix}.
# \end{align}$$