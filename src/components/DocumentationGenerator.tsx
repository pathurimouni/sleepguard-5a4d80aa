
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Check } from 'lucide-react';
import ActionButton from './ActionButton';
import { generateProjectDocumentation } from '@/utils/documentation';

const DocumentationGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerateDocumentation = async () => {
    try {
      setIsGenerating(true);
      setIsGenerated(false);
      
      // Generate the PDF documentation
      await generateProjectDocumentation();
      
      setIsGenerated(true);
    } catch (error) {
      console.error('Error generating documentation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 max-w-md mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 shadow-md rounded-xl"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
          <FileText size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Project Documentation</h2>
        
        <p className="text-slate-600 dark:text-slate-300">
          Generate a comprehensive PDF documentation of the SleepGuard project including architecture, features, and user guide.
        </p>
        
        <ActionButton
          variant="primary"
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
          onClick={handleGenerateDocumentation}
          icon={isGenerated ? <Check size={18} /> : <Download size={18} />}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : isGenerated ? 'Documentation Generated' : 'Generate Documentation'}
        </ActionButton>
        
        {isGenerated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-sm text-green-600 dark:text-green-400 font-medium"
          >
            PDF successfully downloaded to your device!
          </motion.div>
        )}
        
        <div className="text-xs text-slate-500 dark:text-slate-400">
          The PDF includes technical architecture, feature explanations, user instructions, and recommendations.
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentationGenerator;
