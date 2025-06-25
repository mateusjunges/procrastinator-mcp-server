process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (! authHeader || ! authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const userResponse = await fetch('https://procrastinator.test/api/user', {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }
        });

        if (! userResponse.ok) {
            return res.status(401).json({
                error: 'invalid_token',
                error_description: 'The access token is invalid or expired.',
            });
        }

        const user = await userResponse.json();
        user.accessToken = token;

        req.user = user;
        req.auth = {
            token: user.accessToken,
        };

        next();
    } catch (error) {
        console.error('Token validation error: ', error);

        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Token validation failed.',
        });
    }
}