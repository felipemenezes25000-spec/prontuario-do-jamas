export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: '15m',
    refreshExpiration: '7d',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'sa-east-1',
    s3: {
      documents: process.env.S3_BUCKET_DOCUMENTS || 'voxpep-documents',
      audio: process.env.S3_BUCKET_AUDIO || 'voxpep-audio',
      images: process.env.S3_BUCKET_IMAGES || 'voxpep-images',
    },
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:5173',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/v1/auth/sso/google/callback',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    callbackUrl:
      process.env.MICROSOFT_CALLBACK_URL ||
      'http://localhost:3000/api/v1/auth/sso/microsoft/callback',
  },
  daily: {
    apiKey: process.env.DAILY_API_KEY || '',
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
  },
});
