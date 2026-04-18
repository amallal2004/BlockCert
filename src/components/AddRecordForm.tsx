import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, Download, Hash, Blocks, Hexagon, Wallet, ExternalLink, UploadCloud, Copy } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { generateSHA512Hash, computeFileHash } from "@/lib/crypto";
import { addCertificate, getCertificateRegistration } from "@/lib/blockchain";
import {
  addRecord,
  addStudentUser,
  deleteRecord,
  deleteStudentUser,
  getDepartments,
  updateRecordBlockchainDetails,
} from "@/lib/database";
import { StudentRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, isMetaMaskInstalled, getEtherscanTxUrl } from "@/lib/ethereum";
import { deleteStoredFile, uploadCertificate, uploadPhoto } from "@/lib/storage";

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_CERT_TYPES = ["application/pdf", ...ACCEPTED_IMAGE_TYPES];

const formSchema = z.object({
  studentName: z.string().min(1, "Student name is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  department: z.string().min(1, "Department is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  dateOfCompletion: z.string().min(1, "Date of completion is required"),
  totalMarks: z.coerce.number().min(0).max(100, "Marks cannot exceed 100"),
  cgpa: z.coerce.number().min(0).max(10, "CGPA cannot exceed 10.0"),
  certificateFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Certificate file is required.")
    .refine((files) => files?.[0]?.size <= MAX_CERTIFICATE_SIZE, `Max file size is 10MB.`)
    .refine(
      (files) => ACCEPTED_CERT_TYPES.includes(files?.[0]?.type),
      "Only .pdf, .jpg, .jpeg, and .png formats are supported."
    ),
  photoFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Student photo is required.")
    .refine((files) => files?.[0]?.size <= MAX_PHOTO_SIZE, `Max file size is 2MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, and .png formats are supported."
    ),
});

interface Props {
  onBack: () => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

const AddRecordForm = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [result, setResult] = useState<StudentRecord | null>(null);
  const [studentPassword, setStudentPassword] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentName: "",
      rollNumber: "",
      department: "",
      academicYear: "",
      dateOfJoining: "",
      dateOfCompletion: "",
      totalMarks: undefined,
      cgpa: undefined,
    },
  });

  const metaMaskInstalled = isMetaMaskInstalled();

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
      toast({ title: "✅ Wallet Connected", description: `${address.slice(0, 6)}...${address.slice(-4)}` });
    } catch (error: unknown) {
      toast({ title: "Wallet Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setLoadingStatus("Starting upload...");
    
    let certificatePath: string | null = null;
    let photoPath: string | null = null;
    let provisionalRecord: StudentRecord | null = null;
    let createdStudentId: string | null = null;
    let studentWasCreated = false;
    let blockchainRegistered = false;

    try {
      const { certificateFile, photoFile, ...textData } = values;
      const cert = certificateFile[0];
      const photo = photoFile[0];
      const normalizedRollNumber = textData.rollNumber.trim();
      const studentCode = normalizedRollNumber.toLowerCase();
      const normalizedName = textData.studentName.trim();

      // 1. Compute file hashes before any remote side effects
      setLoadingStatus("Computing file hashes...");
      const certHash = await computeFileHash(cert);
      const photoHash = await computeFileHash(photo);

      // 2. Compute master hash
      setLoadingStatus("Computing master hash...");
      const masterHash = await generateSHA512Hash({
        studentName: normalizedName,
        rollNumber: normalizedRollNumber,
        department: textData.department,
        academicYear: textData.academicYear,
        dateOfJoining: textData.dateOfJoining,
        dateOfCompletion: textData.dateOfCompletion,
        totalMarks: textData.totalMarks,
        cgpa: textData.cgpa,
        certificateFileHash: certHash,
        photoHash: photoHash,
      });

      const verifyUrl = `${window.location.origin}/verify?hash=${masterHash}`;

      // 3. Create or repair the student auth user before touching the record table
      setLoadingStatus("Creating student account...");
      const { user, wasCreated } = await addStudentUser(normalizedName, normalizedRollNumber);
      createdStudentId = user.id;
      studentWasCreated = wasCreated;

      // 4. Upload files only after account creation succeeds
      setLoadingStatus("Uploading certificate...");
      certificatePath = await uploadCertificate(cert, normalizedRollNumber);
      setLoadingStatus("Uploading photo...");
      photoPath = await uploadPhoto(photo, normalizedRollNumber);

      // 5. Save a provisional DB row before the irreversible blockchain write
      setLoadingStatus("Saving to database...");
      provisionalRecord = {
        id: crypto.randomUUID(),
        studentName: normalizedName,
        rollNumber: normalizedRollNumber,
        department: textData.department,
        academicYear: textData.academicYear,
        dateOfJoining: textData.dateOfJoining,
        dateOfCompletion: textData.dateOfCompletion,
        totalMarks: textData.totalMarks,
        cgpa: textData.cgpa,
        certificateFilePath: certificatePath,
        photoPath,
        certificateFileHash: certHash,
        photoHash,
        certificateHash: masterHash,
        blockchainTxHash: "",
        qrCodeData: verifyUrl,
        createdAt: new Date().toISOString(),
        status: "registered",
      };
      await addRecord(provisionalRecord, user.id);

      // 6. Register on blockchain as the final irreversible step
      setLoadingStatus("Checking blockchain...");
      const existingOnChain = await getCertificateRegistration(masterHash);
      const blockchainEntry = existingOnChain.exists
        ? {
            txHash: existingOnChain.txHash || "",
            blockNumber: existingOnChain.blockNumber || 0,
          }
        : await (async () => {
            setLoadingStatus("Waiting for wallet approval...");
            return addCertificate(masterHash);
          })();
      blockchainRegistered = true;

      if (!blockchainEntry.txHash) {
        throw new Error("Certificate exists on-chain, but the original transaction hash could not be recovered");
      }

      // 7. Finalize the provisional DB row with the real transaction hash
      setLoadingStatus("Finalizing registration...");
      await updateRecordBlockchainDetails(provisionalRecord.id, blockchainEntry.txHash, verifyUrl);

      const record: StudentRecord = {
        ...provisionalRecord,
        blockchainTxHash: blockchainEntry.txHash,
      };

      // Default password is the roll number (lowercase)
      setStudentPassword(studentCode);

      setResult(record);
      toast({
        title: "✅ Certificate Registered",
        description: "Hash stored on Sepolia blockchain & database!",
      });
    } catch (error: unknown) {
      const cleanupWarnings: string[] = [];

      if (!blockchainRegistered) {
        if (provisionalRecord) {
          try {
            await deleteRecord(provisionalRecord.id);
          } catch (cleanupError: unknown) {
            cleanupWarnings.push(`record cleanup failed: ${getErrorMessage(cleanupError)}`);
          }
        }

        if (certificatePath) {
          try {
            await deleteStoredFile("certificates", certificatePath);
          } catch (cleanupError: unknown) {
            cleanupWarnings.push(`certificate cleanup failed: ${getErrorMessage(cleanupError)}`);
          }
        }

        if (photoPath) {
          try {
            await deleteStoredFile("photos", photoPath);
          } catch (cleanupError: unknown) {
            cleanupWarnings.push(`photo cleanup failed: ${getErrorMessage(cleanupError)}`);
          }
        }

        if (studentWasCreated && createdStudentId) {
          try {
            await deleteStudentUser(createdStudentId);
          } catch (cleanupError: unknown) {
            cleanupWarnings.push(`student account cleanup failed: ${getErrorMessage(cleanupError)}`);
          }
        }
      }

      const description = cleanupWarnings.length > 0
        ? `${getErrorMessage(error)}. Cleanup warnings: ${cleanupWarnings.join("; ")}`
        : getErrorMessage(error);

      toast({ title: "Error", description, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const copyCredentials = () => {
    if (result && studentPassword) {
      navigator.clipboard.writeText(`Email: ${result.rollNumber.toLowerCase()}@blockcert.edu\nPassword: ${studentPassword}`);
      toast({ title: "Copied credentials" });
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result?.rollNumber}_certificate_qr.png`;
    a.click();
  };

  if (result) {
    const isRealTx = result.blockchainTxHash.startsWith("0x") && result.blockchainTxHash.length === 66;
    return (
      <div className="min-h-screen bg-background cyber-grid p-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="glass-card-green rounded-2xl p-8 neon-border-green">
              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                  className="mx-auto mb-4 h-20 w-20 rounded-full bg-neon-green/10 flex items-center justify-center neon-border-green neon-pulse">
                  <CheckCircle className="h-10 w-10 text-neon-green" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold tracking-wider">REGISTERED ON SEPOLIA</h2>
                <p className="text-muted-foreground text-sm mt-1">Certificate stored on Sepolia blockchain</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                {[
                  { label: "STUDENT", value: result.studentName },
                  { label: "ROLL NO", value: result.rollNumber },
                  { label: "DEPARTMENT", value: result.department },
                  { label: "MARKS", value: `${result.totalMarks}%` },
                  { label: "CGPA", value: result.cgpa },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 rounded-xl p-3 border border-border/20">
                    <p className="text-muted-foreground text-xs font-display tracking-wider">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              {studentPassword && (
                <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                   <div className="flex justify-between items-center mb-2">
                     <h3 className="text-yellow-500 font-display tracking-wider text-xs">STUDENT CREDENTIALS (ONE-TIME VIEW)</h3>
                     <Button size="sm" variant="ghost" className="h-6 px-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/20" onClick={copyCredentials}>
                       <Copy className="h-3 w-3 mr-1"/> Copy
                     </Button>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-sm font-mono mt-2">
                     <div className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Email: <span className="text-foreground">{result.rollNumber.toLowerCase()}@blockcert.edu</span></div>
                     <div className="text-muted-foreground">Password: <span className="text-foreground">{studentPassword}</span></div>
                   </div>
                   <p className="text-[10px] text-yellow-500/70 mt-2">Please copy and securely share these credentials with the student.</p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-cyan/10">
                  <div className="flex items-center gap-2 text-xs text-neon-cyan mb-1 font-display tracking-wider">
                    <Hash className="h-3 w-3" /> CERTIFICATE HASH
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{result.certificateHash}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-neon-purple/10">
                  <div className="flex items-center justify-between text-xs text-neon-purple mb-1 font-display tracking-wider">
                    <div className="flex items-center gap-2">
                      <Blocks className="h-3 w-3" /> TX HASH
                    </div>
                    {isRealTx && (
                      <a href={getEtherscanTxUrl(result.blockchainTxHash)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-neon-cyan hover:underline">
                        <ExternalLink className="h-3 w-3" /> Etherscan
                      </a>
                    )}
                  </div>
                  <p className="text-xs font-mono break-all text-muted-foreground">{result.blockchainTxHash}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="p-5 bg-foreground rounded-2xl neon-border-cyan neon-pulse">
                  <QRCodeCanvas value={result.qrCodeData} size={200} level="H" bgColor="#ffffff" fgColor="#0a0e1a" />
                </div>
                <Button onClick={downloadQR} className="btn-neon-cyan border-0 font-display tracking-wider text-sm rounded-xl h-11">
                  <Download className="mr-2 h-4 w-4" /> DOWNLOAD QR
                </Button>
              </div>

              <Button onClick={onBack} variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-foreground font-display tracking-wider text-xs">
                BACK TO DASHBOARD
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const inputClass = "bg-muted/30 border-border/50 h-12 font-mono text-sm focus:border-primary focus:ring-primary/20 transition-all";
  const fileInputClass = "flex h-12 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:bg-muted/50 transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-full file:bg-primary/10 file:text-primary";

  return (
    <div className="min-h-screen bg-background cyber-grid p-4">
      <div className="container mx-auto max-w-3xl">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="glass-card rounded-2xl p-8 neon-border-cyan shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl btn-neon-cyan flex items-center justify-center">
                <Hexagon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-wider">ADD RECORD</h2>
                <p className="text-muted-foreground text-sm">Register a new certificate on Sepolia</p>
              </div>
            </div>

            {metaMaskInstalled && (
              <div>
                {walletAddress ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-xs shadow-[0_0_10px_rgba(0,255,128,0.1)]">
                    <Wallet className="h-3 w-3 text-neon-green" />
                    <span className="font-mono text-neon-green">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <Button onClick={handleConnectWallet} size="sm" className="btn-neon-purple border-0 font-display tracking-wider text-xs rounded-xl">
                    <Wallet className="mr-2 h-3 w-3" /> CONNECT
                  </Button>
                )}
              </div>
            )}
          </div>

          {!metaMaskInstalled && (
            <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border/30 text-sm text-muted-foreground text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-semibold mb-1">MetaMask Required</p>
              <p className="text-xs mb-3">Install MetaMask to register certificates on Sepolia blockchain.</p>
              <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-neon-cyan hover:underline text-xs">
                <ExternalLink className="h-3 w-3" /> Install MetaMask
              </a>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-xs font-display text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Student Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="studentName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">STUDENT NAME</FormLabel>
                      <FormControl><Input placeholder="Full name" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rollNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">ROLL NUMBER</FormLabel>
                      <FormControl><Input placeholder="CS2024001" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">DEPARTMENT</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-card border-border">
                          {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="academicYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">ACADEMIC YEAR</FormLabel>
                      <FormControl><Input placeholder="2020-2024" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-display text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Academic & Dates</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="dateOfJoining" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">DATE OF JOINING</FormLabel>
                      <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfCompletion" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">DATE OF COMPLETION</FormLabel>
                      <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="totalMarks" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">TOTAL MARKS (%)</FormLabel>
                      <FormControl><Input type="number" min={0} max={100} step={0.01} placeholder="85.5" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cgpa" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">CGPA</FormLabel>
                      <FormControl><Input type="number" min={0} max={10} step={0.01} placeholder="8.75" className={inputClass} {...field} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-display text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4"/> Document Uploads
                </h3>
                
                <FormField control={form.control} name="certificateFile" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">DEGREE CERTIFICATE (PDF/IMAGE, MAX 10MB)</FormLabel>
                    <FormControl>
                      <Input type="file" accept=".pdf,image/jpeg,image/png,image/jpg" className={fileInputClass}
                        {...form.register("certificateFile")} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="photoFile" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-display text-xs tracking-wider text-muted-foreground">STUDENT PHOTO (JPG/PNG, MAX 2MB)</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/jpeg,image/png,image/jpg" className={fileInputClass}
                        {...form.register("photoFile")} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} />
              </div>

              <Button
                type="submit"
                className="w-full btn-neon-cyan border-0 h-14 font-display tracking-wider text-base rounded-xl mt-4 relative overflow-hidden group"
                disabled={loading || !metaMaskInstalled || !walletAddress}
              >
                {loading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm z-10 transition-all">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-neon-cyan" />
                        <span className="text-sm font-semibold tracking-wider">{loadingStatus}</span>
                    </div>
                )}
                <Blocks className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                REGISTER ON SEPOLIA
              </Button>
              {metaMaskInstalled && !walletAddress && (
                <p className="text-xs text-center text-muted-foreground">Connect your wallet first to register on-chain</p>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddRecordForm;
