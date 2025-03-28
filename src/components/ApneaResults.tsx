
import React from 'react';
import { AlertTriangle, Award, BarChart2, ThumbsUp, AlertCircle } from 'lucide-react';
import { ApneaAnalysis } from '@/utils/recordingService';

interface ApneaResultsProps {
  analysis: ApneaAnalysis;
}

const ApneaResults: React.FC<ApneaResultsProps> = ({ analysis }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'text-red-500';
      case 'moderate':
        return 'text-orange-500';
      case 'mild':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'Severe sleep apnea (>30 events/hour)';
      case 'moderate':
        return 'Moderate sleep apnea (15-30 events/hour)';
      case 'mild':
        return 'Mild sleep apnea (5-15 events/hour)';
      default:
        return 'No significant sleep apnea (<5 events/hour)';
    }
  };

  const getRecommendations = (severity: string) => {
    const commonRecommendations = [
      'Maintain a healthy weight',
      'Regular exercise',
      'Avoid alcohol and sedatives before bedtime',
      'Sleep on your side instead of your back',
      'Establish regular sleep schedule'
    ];

    const severeRecommendations = [
      'Consult a sleep specialist immediately',
      'Consider CPAP therapy',
      'Evaluate for surgery options if advised by doctor',
      'Closely monitor blood pressure and heart health'
    ];

    const moderateRecommendations = [
      'Consult a sleep specialist',
      'Consider oral appliances or CPAP therapy',
      'Positional therapy',
      'Regular follow-up with healthcare provider'
    ];

    const mildRecommendations = [
      'Consult with your doctor',
      'Consider lifestyle modifications first',
      'May benefit from oral appliances',
      'Follow up to ensure symptoms improve'
    ];

    switch (severity) {
      case 'severe':
        return [...severeRecommendations, ...commonRecommendations];
      case 'moderate':
        return [...moderateRecommendations, ...commonRecommendations];
      case 'mild':
        return [...mildRecommendations, ...commonRecommendations];
      default:
        return commonRecommendations;
    }
  };

  const renderSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'severe':
        return <AlertTriangle className={`${getSeverityColor(severity)} h-8 w-8`} />;
      case 'moderate':
        return <AlertCircle className={`${getSeverityColor(severity)} h-8 w-8`} />;
      case 'mild':
        return <AlertCircle className={`${getSeverityColor(severity)} h-8 w-8`} />;
      default:
        return <ThumbsUp className={`${getSeverityColor(severity)} h-8 w-8`} />;
    }
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">Sleep Apnea Analysis Results</h3>
          <p className="text-sm text-muted-foreground">
            Based on CNN deep learning analysis of your breathing recording
          </p>
        </div>
        {renderSeverityIcon(analysis.severity)}
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <div className="flex items-center">
          <span className={`text-lg font-bold ${getSeverityColor(analysis.severity)}`}>
            {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)}
          </span>
          <span className="text-sm ml-2 text-muted-foreground">
            ({getSeverityDescription(analysis.severity)})
          </span>
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Events per hour:</span>
            <span className="font-medium">{analysis.events_per_hour}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Analysis confidence:</span>
            <span className="font-medium">{Math.round(analysis.confidence * 100)}%</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Analysis date:</span>
            <span className="font-medium">
              {new Date(analysis.analysis_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium mb-3 flex items-center">
          <Award size={16} className="mr-1 text-primary" />
          Recommendations
        </h4>
        
        <ul className="space-y-2">
          {getRecommendations(analysis.severity).map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span className="text-sm">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm bg-primary/10 text-primary-foreground p-3 rounded-md">
        <p>
          <strong>Important:</strong> This analysis is for informational purposes only. Please consult 
          with a healthcare professional for a proper diagnosis and treatment plan.
        </p>
      </div>
    </div>
  );
};

export default ApneaResults;
