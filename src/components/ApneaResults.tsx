import React from 'react';
import { AlertTriangle, Award, BarChart2, ThumbsUp, AlertCircle, Table as TableIcon } from 'lucide-react';
import { ApneaAnalysis } from '@/utils/recordingService';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  Line, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Legend, 
  ResponsiveContainer,
  Tooltip 
} from 'recharts';

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

  const trainingAccuracyData = [
    { epoch: 0, scenario1: 0.35, scenario2: 0.32, scenario3: 0.38, scenario4: 0.40, scenario5: 0.42 },
    { epoch: 5, scenario1: 0.71, scenario2: 0.61, scenario3: 0.68, scenario4: 0.72, scenario5: 0.73 },
    { epoch: 10, scenario1: 0.79, scenario2: 0.70, scenario3: 0.76, scenario4: 0.78, scenario5: 0.79 },
    { epoch: 20, scenario1: 0.85, scenario2: 0.79, scenario3: 0.83, scenario4: 0.84, scenario5: 0.84 },
    { epoch: 40, scenario1: 0.88, scenario2: 0.85, scenario3: 0.87, scenario4: 0.87, scenario5: 0.88 },
    { epoch: 60, scenario1: 0.90, scenario2: 0.88, scenario3: 0.89, scenario4: 0.89, scenario5: 0.90 },
    { epoch: 80, scenario1: 0.91, scenario2: 0.90, scenario3: 0.90, scenario4: 0.90, scenario5: 0.91 },
    { epoch: 100, scenario1: 0.92, scenario2: 0.91, scenario3: 0.91, scenario4: 0.91, scenario5: 0.92 },
  ];

  const cnnModelData = [
    { layer: 'conv2d_1 (Conv2D)', outputShape: '(None, 20, 20, 32)', params: 320 },
    { layer: 'max_pooling2d_1', outputShape: '(MaxPooling2(None, 10, 10, 32))', params: 0 },
    { layer: 'conv2d_2 (Conv2D)', outputShape: '(None, 8, 8, 32)', params: 9248 },
    { layer: 'max_pooling2d_2', outputShape: '(MaxPooling2(None, 4, 4, 32))', params: 0 },
    { layer: 'conv2d_3 (Conv2D)', outputShape: '(None, 2, 2, 64)', params: 18496 },
    { layer: 'max_pooling2d_3', outputShape: '(MaxPooling2 (None, 1, 1, 64))', params: 0 },
    { layer: 'flatten_1 (Flatten)', outputShape: '(None, 64)', params: 0 },
    { layer: 'dense_1 (Dense)', outputShape: '(None, 64)', params: 4160 },
    { layer: 'dropout_1 (Dropout)', outputShape: '(None, 64)', params: 0 },
    { layer: 'dense_2 (Dense)', outputShape: '(None, 2)', params: 130 },
  ];

  const chartConfig = {
    scenario1: { label: 'Scenario 1', color: '#4338ca' },
    scenario2: { label: 'Scenario 2', color: '#ef4444' },
    scenario3: { label: 'Scenario 3', color: '#10b981' },
    scenario4: { label: 'Scenario 4', color: '#6366f1' },
    scenario5: { label: 'Scenario 5', color: '#06b6d4' },
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
            {typeof analysis.severity === 'string' ? 
              analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1) : 
              'Unknown'}
          </span>
          <span className="text-sm ml-2 text-muted-foreground">
            ({getSeverityDescription(typeof analysis.severity === 'string' ? analysis.severity : 'none')})
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
          <BarChart2 size={16} className="mr-1 text-primary" />
          CNN Model Training Accuracy
        </h4>
        <div className="border rounded-lg bg-card p-3 h-72">
          <ChartContainer config={chartConfig} className="h-full">
            <LineChart
              data={trainingAccuracyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="epoch" 
                label={{ value: 'Epoch Iteration', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis 
                label={{ value: 'Training Accuracy', angle: -90, position: 'insideLeft' }}
                domain={[0.3, 1]} 
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="scenario1" stroke={chartConfig.scenario1.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="scenario2" stroke={chartConfig.scenario2.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="scenario3" stroke={chartConfig.scenario3.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="scenario4" stroke={chartConfig.scenario4.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="scenario5" stroke={chartConfig.scenario5.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
          <div className="text-xs text-center text-muted-foreground mt-2">
            Figure: Comparison of training accuracy for five empirical studies
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium mb-3 flex items-center">
          <TableIcon size={16} className="mr-1 text-primary" />
          CNN Model Architecture
        </h4>
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableCaption>Deep Convolutional Neural Network Design</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Layer (type)</TableHead>
                <TableHead>Output Shape</TableHead>
                <TableHead>Param #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cnnModelData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.layer}</TableCell>
                  <TableCell>{row.outputShape}</TableCell>
                  <TableCell>{row.params}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} className="font-bold">Total params:</TableCell>
                <TableCell className="font-bold">32,614</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}>Trainable params:</TableCell>
                <TableCell>32,614</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}>Non-trainable params:</TableCell>
                <TableCell>0</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Train on 794 samples, validate on 3178 samples</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium mb-3 flex items-center">
          <Award size={16} className="mr-1 text-primary" />
          Recommendations
        </h4>
        
        <ul className="space-y-2">
          {getRecommendations(typeof analysis.severity === 'string' ? analysis.severity : 'none').map((recommendation, index) => (
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
