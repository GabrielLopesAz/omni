const fs = require('fs');
let c = fs.readFileSync('backend/test/logistica.e2e-spec.ts', 'utf8');
c = c.replace(import { DataSource } from 'typeorm';, import { DataSource } from 'typeorm';\nimport { JwtService } from '@nestjs/jwt';);
c = c.replace(const jwtSvc = app.get<import('@nestjs/jwt').JwtService>('JwtService');, const jwtSvc = app.get(JwtService););
fs.writeFileSync('backend/test/logistica.e2e-spec.ts', c);
