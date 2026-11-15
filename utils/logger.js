import pino from "pino";

const isProd = process.env.NODE_ENV === 'production';
const basePino = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: ['password', 'token', 'authorization', '*.password', '*.token'],
  transport: !isProd
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export class Logger {

    constructor(context = "App", pinoInstance = basePino) {
        this.logger = pinoInstance.child({ 
            context 
        });
    }

    child(bindings) {
        return new Logger(undefined, this.logger.child(bindings));
    }

    info(message, meta = {}) {
        this.logger.info(meta, message);
    }
    
    warn(message, meta = {}) {
        this.logger.warn(meta, message);
    }
    
    debug(message, meta = {}) {
        this.logger.debug(meta, message);
    }

    error(message, errorOrMeta = {}) {
        if (errorOrMeta instanceof Error) {
            this.logger.error({ err: errorOrMeta }, message);
        } else {
            this.logger.error(errorOrMeta, message);
        }
    }

}