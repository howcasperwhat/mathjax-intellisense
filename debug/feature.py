def euler_identity():
    """
    Euler's identity: :math:`e^{i\pi} + 1 = 0`
    """
    import cmath
    result = cmath.exp(cmath.pi * 1j) + 1
    return result

def zeta_function():
    r"""
    Zeta Function: It is defined as below:
    .. math::
        \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
    """
    result = sum(1 / (n ** 2) for n in range(1, 10000))
    return result