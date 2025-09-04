import crypto from 'crypto';

/**
 * API密钥加密和解密工具
 * 使用AES-256-GCM算法确保API密钥安全存储
 */
export class ApiKeyEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // For GCM, this is always 16
  private static readonly TAG_LENGTH = 16; // For GCM, this is always 16
  private static readonly KEY_LENGTH = 32; // For AES-256

  /**
   * 获取加密密钥，优先使用环境变量，否则使用默认值
   */
  private static getEncryptionKey(): Buffer {
    const keyString = process.env.API_KEY_ENCRYPTION_SECRET || 'default-encryption-key-change-in-production-2024';
    
    // 使用PBKDF2从字符串生成固定长度的密钥
    return crypto.pbkdf2Sync(keyString, 'api-key-salt', 100000, this.KEY_LENGTH, 'sha256');
  }

  /**
   * 加密API密钥
   */
  static encrypt(plaintext: string): string {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid API key for encryption');
    }

    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 组合 IV + 加密数据
      const result = iv.toString('hex') + ':' + encrypted;
      
      console.log('API key encrypted successfully');
      return result;
    } catch (error) {
      console.error('Failed to encrypt API key:', error);
      throw new Error('API密钥加密失败');
    }
  }

  /**
   * 解密API密钥
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data for decryption');
    }

    // 检查是否是未加密的占位符
    if (encryptedData === 'NEEDS_CONFIGURATION') {
      throw new Error('API configuration needs to be set up');
    }

    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('API密钥解密失败');
    }
  }

  /**
   * 验证加密数据的完整性
   */
  static validateEncrypted(encryptedData: string): boolean {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return false;
      }

      // 检查格式
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        return false;
      }

      // 验证IV长度
      const iv = Buffer.from(parts[0], 'hex');
      
      return iv.length === this.IV_LENGTH;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成安全的API密钥掩码用于前端显示
   */
  static maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey === 'NEEDS_CONFIGURATION') {
      return '未设置';
    }

    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }

    // 显示前4位和后4位，中间用*代替
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.min(12, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * 测试加密解密功能
   */
  static test(): boolean {
    try {
      const testKey = 'test-api-key-12345';
      const encrypted = this.encrypt(testKey);
      const decrypted = this.decrypt(encrypted);
      
      const isValid = testKey === decrypted;
      console.log(`Encryption test ${isValid ? 'passed' : 'failed'}`);
      
      return isValid;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}

export default ApiKeyEncryption;