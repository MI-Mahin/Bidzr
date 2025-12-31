import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Strategy as GoogleStrategy, StrategyOptions as GoogleStrategyOptions } from 'passport-google-oauth20';
import { User } from '../models';
import config from '../config';
import { UserRole, IJwtPayload } from '../types';

// JWT Strategy
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload: IJwtPayload, done) => {
    try {
      const user = await User.findById(payload.userId);

      if (!user || !user.isActive) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy (only if credentials are configured)
if (config.google.clientId && config.google.clientSecret) {
  const googleOptions: GoogleStrategyOptions = {
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl,
  };

  passport.use(
    new GoogleStrategy(googleOptions, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.isEmailVerified = true;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        user = new User({
          email,
          name: profile.displayName || profile.name?.givenName || 'User',
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          isEmailVerified: true,
          role: UserRole.PLAYER, // Default role for OAuth users
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    })
  );
}

export default passport;
