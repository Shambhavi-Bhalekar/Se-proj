//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { BookOpen, Users, MessageSquare, ArrowRight } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <motion.div className="text-center" variants={containerVariants} initial="hidden" animate="visible">
            <motion.h1 variants={itemVariants} className="text-5xl sm:text-7xl font-bold text-balance mb-6">
              Learn Together,
              <span className="gradient-primary bg-clip-text text-transparent"> Grow Faster</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join StudyBuddy - the collaborative learning platform where students, developers, and professionals
              connect, study, and achieve their goals together.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth"
                className="px-8 py-4 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 smooth-transition hover:shadow-lg hover:shadow-primary/50 hover:scale-105"
              >
                Get Started <ArrowRight size={20} />
              </Link>
              <Link
                href="/communities"
                className="px-8 py-4 rounded-xl border-2 border-primary/30 font-semibold smooth-transition hover:bg-primary/10 hover:border-primary/50"
              >
                Explore Communities
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 mt-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: Users, title: "Join Communities", desc: "Connect with like-minded learners" },
              { icon: MessageSquare, title: "Real-time Chat", desc: "Instant messaging and discussions" },
              { icon: BookOpen, title: "Study Rooms", desc: "Dedicated spaces for focused learning" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="glass rounded-2xl p-6 hover:bg-white/20 smooth-transition group"
              >
                <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 smooth-transition" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-t border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid md:grid-cols-4 gap-8 text-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { number: "10K+", label: "Active Learners" },
              { number: "500+", label: "Communities" },
              { number: "50K+", label: "Study Hours" },
              { number: "98%", label: "Satisfaction" },
            ].map((stat, i) => (
              <motion.div key={i} variants={itemVariants}>
                <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl mx-4 sm:mx-8 mb-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.h2
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to Start Learning?
          </motion.h2>
          <motion.p
            className="text-lg text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join thousands of students already collaborating on StudyBuddy
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/auth"
              className="inline-block px-8 py-4 rounded-xl gradient-primary text-white font-semibold smooth-transition hover:shadow-lg hover:shadow-primary/50 hover:scale-105"
            >
              Join Now for Free
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
