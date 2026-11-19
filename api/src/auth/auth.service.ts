import type { AuthResponse, LoginInput, RegisterInput, User } from '@gym/shared';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/database.js';
import { users } from '../db/schema.js';

const publicColumns = { id: users.id, email: users.email, name: users.name };

@Injectable()
export class AuthService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async register({ email, password, name }: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await hash(password);
    const [user] = await this.db
      .insert(users)
      .values({ email, passwordHash, name })
      .onConflictDoNothing({ target: users.email })
      .returning(publicColumns);
    if (!user) throw new ConflictException('Цей email вже зареєстровано');
    return this.respond(user);
  }

  async login({ email, password }: LoginInput): Promise<AuthResponse> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    // Same message for unknown email and wrong password, so emails can't be probed.
    if (!row || !(await verify(row.passwordHash, password))) {
      throw new UnauthorizedException('Невірний email або пароль');
    }
    return this.respond({ id: row.id, email: row.email, name: row.name });
  }

  async me(id: number): Promise<User> {
    const [user] = await this.db.select(publicColumns).from(users).where(eq(users.id, id));
    // Valid token, but the user was deleted.
    if (!user) throw new UnauthorizedException('Сесія завершилась. Увійдіть знову');
    return user;
  }

  private async respond(user: User): Promise<AuthResponse> {
    return { token: await this.jwt.signAsync({ sub: user.id }), user };
  }
}
