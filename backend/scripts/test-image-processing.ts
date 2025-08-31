#!/usr/bin/env node

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST, before importing services
dotenv.config();

// Import services after environment variables are loaded
import { fileStorage } from '../src/services/fileStorage';
import { geminiService } from '../src/services/gemini';
import { promptTemplateService } from '../src/services/promptTemplate';

async function testImageProcessingFlow() {
  console.log('🔧 Testing AI Image Processing Flow');
  console.log('=====================================\n');

  try {
    // 1. Test Gemini API connection
    console.log('1. Testing Gemini API connection...');
    const connectionResult = await geminiService.testConnection();
    if (!connectionResult.success) {
      console.error('❌ Gemini API connection failed:', connectionResult.error);
      console.log('\n💡 Make sure you have set GOOGLE_API_KEY in your .env file');
      return;
    }
    console.log('✅ Gemini API connection successful\n');

    // 2. Initialize file storage
    console.log('2. Initializing file storage...');
    await fileStorage.init();
    console.log('✅ File storage initialized\n');

    // 3. Test prompt template service
    console.log('3. Testing prompt template service...');
    const optimizePrompts = promptTemplateService.generatePromptsForProcessing('optimize');
    console.log(`✅ Generated ${optimizePrompts.length} optimization prompts`);
    console.log(`   Sample prompt: "${optimizePrompts[0].substring(0, 100)}..."\n`);

    // 4. Use existing test image
    console.log('4. Using test image...');
    const testImagePath = 'uploads/test.png'; // Use relative path in storage
    console.log(`✅ Using test image: ${testImagePath}\n`);

    // 5. Test the complete processing flow
    console.log('5. Testing complete image processing flow...');
    console.log('   This may take 30-60 seconds depending on Gemini API response time...');

    const result = await geminiService.processImage(testImagePath, {
      type: 'optimize',
      prompt: 'Test optimization'
    });

    if (result.success) {
      console.log(`✅ Image processing successful!`);
      console.log(`   Generated ${result.variants.length} variants`);

      for (let i = 0; i < result.variants.length; i++) {
        const variant = result.variants[i];
        console.log(`   Variant ${i + 1}: Score ${variant.score}, Size: ${(variant.imageBuffer.length / 1024).toFixed(1)}KB`);

        // Save processed variant
        const savedVariant = await fileStorage.saveResultImage(
          variant.imageBuffer,
          `test_variant_${i + 1}.jpg`
        );
        console.log(`   Saved to: ${savedVariant.filePath}`);
      }
    } else {
      console.error('❌ Image processing failed:', result.error);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Gemini API connection: ✅');
    console.log('   - File storage: ✅');
    console.log('   - Prompt templates: ✅');
    console.log('   - Image processing: ' + (result.success ? '✅' : '❌'));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Ensure GOOGLE_API_KEY is set in .env file');
    console.log('   - Verify internet connection for API calls');
    console.log('   - Check file permissions for storage directories');
  }
}

// Run the test
if (require.main === module) {
  testImageProcessingFlow().catch(console.error);
}

export { testImageProcessingFlow };