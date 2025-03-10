
import React from "react";
import { motion } from "framer-motion";
import { Info, AlertTriangle, Cpu, Shield, Zap, Stethoscope } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const About = () => {
  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-24 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold mb-2"
            >
              About SleepGuard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Understanding sleep apnea and how we help
            </motion.p>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <Info size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">What is Sleep Apnea?</h2>
              </div>

              <p className="mb-4">
                Sleep apnea is a serious sleep disorder that occurs when a person's breathing is 
                interrupted during sleep. People with untreated sleep apnea stop breathing 
                repeatedly during their sleep, sometimes hundreds of times during the night.
              </p>

              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center">
                  <AlertTriangle size={16} className="mr-1 text-amber-500" />
                  Common symptoms include:
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Loud snoring</li>
                  <li>Episodes of breathing cessation during sleep</li>
                  <li>Abrupt awakenings accompanied by shortness of breath</li>
                  <li>Waking up with a dry mouth or sore throat</li>
                  <li>Morning headache</li>
                  <li>Difficulty staying asleep (insomnia)</li>
                  <li>Excessive daytime sleepiness (hypersomnia)</li>
                  <li>Attention problems</li>
                  <li>Irritability</li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <Cpu size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">How SleepGuard Works</h2>
              </div>

              <p className="mb-4">
                SleepGuard uses your device's microphone to monitor breathing patterns while you sleep. 
                Our algorithm analyzes these patterns in real-time to detect potential apnea events.
              </p>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mt-1 mr-3">
                    <Stethoscope size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Real-time Monitoring</h3>
                    <p className="text-sm text-muted-foreground">
                      SleepGuard continuously analyzes your breathing patterns while you sleep.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mt-1 mr-3">
                    <AlertTriangle size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Instant Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive immediate notifications when potential apnea events are detected.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mt-1 mr-3">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Privacy-Focused</h3>
                    <p className="text-sm text-muted-foreground">
                      All processing happens on your device. Your sleep data never leaves your phone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mt-1 mr-3">
                    <Zap size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Low Battery Impact</h3>
                    <p className="text-sm text-muted-foreground">
                      Optimized algorithms ensure minimal battery consumption during sleep tracking.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">Important Disclaimer</h2>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  SleepGuard is not a medical device and is not intended to diagnose, treat, cure, or prevent 
                  any disease or health condition. The application is designed for informational purposes only.
                </p>
                <p className="text-amber-800 dark:text-amber-200 text-sm mt-2">
                  If you suspect you have sleep apnea or any other sleep disorder, please consult with a healthcare 
                  professional. Only a proper medical evaluation can determine if you have sleep apnea.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default About;
