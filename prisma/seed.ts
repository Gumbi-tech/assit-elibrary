import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create 3 Departments
  const softwareEng = await prisma.department.create({
    data: {
      name: 'Software Engineering',
      description: 'Department of Software Engineering and Computer Science'
    }
  })

  const cyberSec = await prisma.department.create({
    data: {
      name: 'Cyber Security',
      description: 'Department of Cyber Security and Information Assurance'
    }
  })

  const multiMedia = await prisma.department.create({
    data: {
      name: 'Multi Media',
      description: 'Department of Multi Media and Digital Design'
    }
  })

  console.log('✅ Created 3 departments')

  // Create sample courses for each department
  await prisma.course.createManyAndReturn({
    data: [
      {
        title: 'Introduction to Software Development',
        code: 'SE-101',
        description: 'Fundamentals of software development and programming',
        departmentId: softwareEng.id,
        credits: 3
      },
      {
        title: 'Data Structures and Algorithms',
        code: 'SE-201',
        description: 'Advanced data structures and algorithm analysis',
        departmentId: softwareEng.id,
        credits: 3
      },
      {
        title: 'Web Application Development',
        code: 'SE-301',
        description: 'Building full-stack web applications',
        departmentId: softwareEng.id,
        credits: 3
      },
      {
        title: 'Network Security Fundamentals',
        code: 'CS-101',
        description: 'Basics of network security and protocols',
        departmentId: cyberSec.id,
        credits: 3
      },
      {
        title: 'Cryptography and Encryption',
        code: 'CS-201',
        description: 'Mathematical foundations of cryptography',
        departmentId: cyberSec.id,
        credits: 3
      },
      {
        title: 'Ethical Hacking and Penetration Testing',
        code: 'CS-301',
        description: 'Methods and tools for security testing',
        departmentId: cyberSec.id,
        credits: 3
      },
      {
        title: 'Digital Media Production',
        code: 'MM-101',
        description: 'Introduction to digital media creation and editing',
        departmentId: multiMedia.id,
        credits: 3
      },
      {
        title: 'Multimedia Storytelling',
        code: 'MM-201',
        description: 'Combining audio, video, and interactive elements',
        departmentId: multiMedia.id,
        credits: 3
      },
      {
        title: 'Advanced Graphics and Animation',
        code: 'MM-301',
        description: '3D modeling and animation techniques',
        departmentId: multiMedia.id,
        credits: 3
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Created courses')

  // Create sample documents
  const uploadsDir = './public/uploads'

  const samplePdfs = [
    { courseCode: 'SE-101', name: 'SE-101-Syllabus', filename: 'SE-101-Syllabus.pdf' },
    { courseCode: 'SE-201', name: 'Algorithms-Reference', filename: 'Algorithms-Reference.pdf' },
    { courseCode: 'SE-301', name: 'Web-Development-Guide', filename: 'Web-Development-Guide.pdf' },
    { courseCode: 'CS-101', name: 'Network-Security-Basics', filename: 'Network-Security-Basics.pdf' },
    { courseCode: 'CS-201', name: 'Cryptography-Handbook', filename: 'Cryptography-Handbook.pdf' },
    { courseCode: 'CS-301', name: 'Pen-Testing-Cheatsheet', filename: 'Pen-Testing-Cheatsheet.pdf' },
    { courseCode: 'MM-101', name: 'Digital-Media-Syllabus', filename: 'Digital-Media-Syllabus.pdf' },
    { courseCode: 'MM-201', name: 'Storytelling-Guide', filename: 'Storytelling-Guide.pdf' },
    { courseCode: 'MM-301', name: 'Animation-Techniques', filename: 'Animation-Techniques.pdf' }
  ]

  for (const pdf of samplePdfs) {
    await prisma.document.create({
      data: {
        name: pdf.name,
        filename: pdf.filename,
        path: `/app/public/uploads/${pdf.filename}`,
        size: 256000,
        mimeType: 'application/pdf'
      }
    })

    // Create empty PDF file
    const pdfContent = `%PDF-1.4
%âãÏÝ
1 0 obj
/Type /Catalog
endobj
2 0 obj
/Type /Pages
/Kids []
endobj
xref
0 3
0000000000 65535 f 
trailer
/Size 3
startxref
0
%%EOF
`
    const fs = require('fs')
    const path = require('path')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    fs.writeFileSync(path.join(uploadsDir, pdf.filename), pdfContent)
    console.log(`✅ Created document: ${pdf.filename}`)
  }

  console.log('🌱 Seed complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })