import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

interface StudentProfile {
  first_name?: string;
  last_name?: string;
  student_id?: string;
  batch?: string;
  program?: string;
}

interface ExamResult {
  id: string;
  courses?: {
    course_name?: string;
    course_code?: string;
  };
  academic_year?: string;
  semester?: string;
  final_score?: number;
  final_grade?: string;
}

interface PDFExportOptions {
  studentProfile: StudentProfile;
  examResults: ExamResult[];
  qrCodeDataUrl?: string;
  studentId?: string;
}

// Generate a unique verification code
const generateVerificationCode = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `SMC-${timestamp}-${randomStr}`.toUpperCase();
};

// Create verification record and generate QR code
const createVerificationQRCode = async (studentId: string, studentProfile: StudentProfile): Promise<string> => {
  try {
    const verificationCode = generateVerificationCode();

    console.log('Creating verification record for student:', studentId, 'with code:', verificationCode);

    // Store verification record in database
    const { data, error } = await supabase
      .from('transcript_verifications')
      .insert([{
        student_id: studentId,
        verification_code: verificationCode,
        transcript_type: 'final_results',
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating verification record:', error);
      throw error;
    }

    console.log('Verification record created successfully:', data);

    // Use a fixed domain or get it from environment
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://192.168.0.134:3002';

    const verificationUrl = `${baseUrl}/verify/${verificationCode}`;
    console.log('Generated verification URL:', verificationUrl);

    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error creating verification QR code:', error);
    // Return a fallback QR code with basic student info
    const fallbackData = `Student: ${studentProfile.first_name} ${studentProfile.last_name}\nID: ${studentProfile.student_id}\nProgram: ${studentProfile.program}`;
    return await QRCode.toDataURL(fallbackData);
  }
};

export const exportFinalResultsToPDF = async (options: PDFExportOptions): Promise<void> => {
  const { studentProfile, examResults, studentId } = options;

  // Generate verification QR code if studentId is provided
  let qrCodeDataUrl = options.qrCodeDataUrl;
  if (studentId && !qrCodeDataUrl) {
    qrCodeDataUrl = await createVerificationQRCode(studentId, studentProfile);
  }

  try {
    // Create a temporary container for PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '0';
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.minHeight = '297mm'; // A4 height
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.fontFamily = 'Times New Roman, serif';
    pdfContainer.style.fontSize = '12pt';
    pdfContainer.style.lineHeight = '1.4';
    pdfContainer.style.color = '#000000';
    pdfContainer.style.padding = '25.4mm'; // 1 inch margins
    pdfContainer.style.boxSizing = 'border-box';

    // Generate the HTML content for PDF
    pdfContainer.innerHTML = generatePDFContent(studentProfile, examResults, qrCodeDataUrl);

    // Append to body temporarily
    document.body.appendChild(pdfContainer);

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate canvas from HTML
    const canvas = await html2canvas(pdfContainer, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    });

    // Remove temporary container
    document.body.removeChild(pdfContainer);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit A4
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add image to PDF
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

    // Generate filename
    const filename = `Final_Results_${studentProfile.student_id || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Save PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

const generatePDFContent = (
  studentProfile: StudentProfile,
  examResults: ExamResult[],
  qrCodeDataUrl?: string
): string => {
  const getStatusBadge = (score: number): string => {
    const status = score >= 50 ? 'Pass' : 'Repeat';
    const bgColor = score >= 50 ? '#e8f5e8' : '#fde8e8';
    return `<span style="display: inline-block; padding: 2px 6px; border: 1px solid #000; background: ${bgColor}; font-size: 10pt; font-weight: bold;">${status}</span>`;
  };

  const calculateFinalResultsStatus = () => {
    const semesterGroups = examResults.reduce((acc: any, result: any) => {
      const key = `${result.academic_year}-${result.semester}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    return Object.entries(semesterGroups).map(([key, results]: [string, any]) => {
      const [academicYear, semester] = key.split('-');
      const hasFailure = results.some((result: any) => result.final_score < 50);
      return {
        academicYear,
        semester,
        status: hasFailure ? 'Repeat' : 'Pass',
        results
      };
    });
  };

  const finalResultsStatus = calculateFinalResultsStatus();

  return `
    <div style="width: 100%; max-width: 160mm; margin: 0 auto; position: relative;">
      <!-- Header Section -->
      <header style="position: relative; border-bottom: 1px solid #000; padding-bottom: 16px; margin-bottom: 16px;">
        ${qrCodeDataUrl ? `
          <div style="position: absolute; top: 0; left: 0;">
            <div style="text-align: center;">
              <img src="${qrCodeDataUrl}" alt="Results QR Code" style="width: 60px; height: 60px; margin-bottom: 4px;" />
              <div style="font-size: 10pt; color: #666;">Verification Code</div>
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-left: 80px;">
          <h1 style="font-size: 18pt; font-weight: bold; color: #1e40af; margin: 0 0 8px 0;">SANCTA MARIA COLLEGE OF NURSING</h1>
          <h2 style="font-size: 14pt; font-weight: 600; color: #374151; margin: 0;">FINAL EXAMINATION RESULTS</h2>
        </div>

        <!-- Student Information -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 16px; font-size: 11pt;">
          <div>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Student Name:</span> ${studentProfile.first_name || ''} ${studentProfile.last_name || ''}</p>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Student ID:</span> ${studentProfile.student_id || ''}</p>
          </div>
          <div>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Batch:</span> ${studentProfile.batch || 'N/A'}</p>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Program:</span> ${studentProfile.program || 'Nursing'}</p>
          </div>
          <div>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Academic Year:</span> 2024/2025</p>
            <p style="margin: 2px 0;"><span style="font-weight: 600;">Date:</span> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <!-- Final Results Table -->
      <section style="margin-bottom: 24px;">
        <div style="background: #f8f9fa; padding: 12px; border: 1px solid #000; margin-bottom: 0;">
          <h3 style="font-size: 14pt; font-weight: 600; color: #374151; margin: 0;">Final Examination Results</h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11pt;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 35%;">Subject</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 15%;">Academic Year</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 10%;">Semester</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 15%;">Final Score</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 10%;">Final Grade</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; width: 15%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${examResults.length > 0 ? examResults.map(result => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: 600;">${result.courses?.course_name || result.courses?.course_code || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${result.academic_year || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${result.semester || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: 600;">${result.final_score || 0}%</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: 600;">${result.final_grade || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${getStatusBadge(result.final_score || 0)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 32px; text-align: center; color: #666;">
                  No final results available yet. Results will appear here once they are published by your lecturers.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </section>

      <!-- Grading Scale and Signatures -->
      <footer style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
        <!-- Grading Scale -->
        <div style="border: 1px solid #000; padding: 16px;">
          <h4 style="font-size: 11pt; font-weight: 600; color: #374151; margin: 0 0 12px 0;">Grading Scale:</h4>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; font-size: 10pt; margin-bottom: 16px;">
            <div style="border: 1px solid #666; padding: 4px; text-align: center; font-weight: 600;">A: 80-100%</div>
            <div style="border: 1px solid #666; padding: 4px; text-align: center; font-weight: 600;">B: 70-79%</div>
            <div style="border: 1px solid #666; padding: 4px; text-align: center; font-weight: 600;">C: 60-69%</div>
            <div style="border: 1px solid #666; padding: 4px; text-align: center; font-weight: 600;">D: 50-59%</div>
            <div style="border: 1px solid #666; padding: 4px; text-align: center; font-weight: 600;">F: Below 50%</div>
          </div>
          
          <div style="margin-top: 16px;">
            <h5 style="font-size: 10pt; font-weight: 600; margin: 0 0 8px 0;">Overall Status:</h5>
            ${finalResultsStatus.map(status => `
              <p style="margin: 4px 0; font-size: 10pt;">
                <span style="font-weight: 600;">${status.academicYear} - Semester ${status.semester}:</span> 
                ${getStatusBadge(status.status === 'Pass' ? 75 : 40)}
              </p>
            `).join('')}
          </div>
        </div>

        <!-- Signatures -->
        <div style="border: 1px solid #000; padding: 16px;">
          <h4 style="font-size: 11pt; font-weight: 600; color: #374151; margin: 0 0 12px 0;">Official Signatures:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="text-align: center;">
              <div style="border-bottom: 1px solid #000; margin-bottom: 4px; padding-bottom: 20px;"></div>
              <p style="font-size: 10pt; font-weight: 600; margin: 0;">Class Teacher Signature</p>
              <p style="font-size: 10pt; color: #666; margin: 4px 0 0 0;">Date: ___________</p>
            </div>
            <div style="text-align: center;">
              <div style="border-bottom: 1px solid #000; margin-bottom: 4px; padding-bottom: 20px;"></div>
              <p style="font-size: 10pt; font-weight: 600; margin: 0;">Institution Seal</p>
              <p style="font-size: 10pt; color: #666; margin: 4px 0 0 0;">Official Stamp</p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px;">
            <div style="border-bottom: 1px solid #000; margin-bottom: 4px; padding-bottom: 20px;"></div>
            <p style="font-size: 10pt; font-weight: 600; margin: 0;">Principal Signature</p>
            <p style="font-size: 10pt; color: #666; margin: 4px 0 0 0;">Date: ___________</p>
          </div>
        </div>
      </footer>
    </div>
  `;
};
