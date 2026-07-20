"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Wallet, Calendar, Plus, Activity, DollarSign, Share2, Printer, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

interface Pago {
  id: string;
  monto_pagado: number;
  capital_abonado: number;
  interes_pagado: number;
  fecha_pago: string;
  numero_cuota: number;
}

interface Prestamo {
  id: string;
  cliente_id: string;
  monto: number;
  porcentaje_interes: number;
  total_a_pagar: number;
  ganancia_esperada: number;
  tipo_pago: string;
  numero_cuotas: number;
  valor_cuota: number;
  cuotas_pagadas: number;
  saldo_pendiente: number;
  capital_recuperado: number;
  interes_ganado: number;
  fecha_inicio: string;
  estado: string;
  pagos: Pago[];
  clientes: {
    nombre: string;
    telefono?: string;
  };
}

function generatePDFDoc(prestamo: Prestamo) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let telefono = prestamo.clientes?.telefono || "";
  telefono = telefono.replace(/\D/g, "");
  if (telefono.length === 8) {
    telefono = "505" + telefono;
  } else if (telefono.length > 8 && !telefono.startsWith("505")) {
    telefono = "505" + telefono;
  }
  const formattedTel = telefono ? `+505 ${telefono.replace(/^505/, "")}` : "Sin registrar";

  // --- DISEÑO AESTHETIC ---
  
  // 1. Encabezado / Banner Superior (Teal oscuro de PrestaFácil)
  doc.setFillColor(15, 118, 110); // #0f766e
  doc.rect(15, 15, 180, 24, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PRESTAFÁCIL", 22, 29);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241); // Teal claro
  doc.text("TARJETA DE CONTROL DE PAGOS", 22, 34);

  // 2. Información General (Dos columnas)
  // Columna Izquierda: Cliente
  doc.setTextColor(115, 115, 115); // Gris
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INFORMACIÓN DEL CLIENTE", 20, 52);
  
  doc.setTextColor(24, 24, 27); // Zinc 900
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(prestamo.clientes?.nombre || "Cliente General", 20, 58);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91); // Zinc 600
  doc.text(`Teléfono: ${formattedTel}`, 20, 64);

  // Columna Derecha: Crédito
  doc.setTextColor(115, 115, 115);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DETALLES DEL CRÉDITO", 115, 52);
  
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`ID Préstamo: ${prestamo.id.slice(0, 8).toUpperCase()}`, 115, 58);
  doc.text(`Fecha Inicio: ${new Date(prestamo.fecha_inicio).toLocaleDateString("es-NI")}`, 115, 64);
  
  const estadoUpper = prestamo.estado.toUpperCase();
  doc.text(`Frecuencia: ${prestamo.tipo_pago.toUpperCase()}`, 115, 70);
  doc.text(`Estado: ${estadoUpper}`, 115, 76);

  // 3. Indicadores Clave / KPI Boxes (Fondo Gris Claro)
  const boxes = [
    { label: "MONTO CRÉDITO", value: `C$${prestamo.monto.toFixed(2)}` },
    { label: "TOTAL A PAGAR", value: `C$${prestamo.total_a_pagar.toFixed(2)}` },
    { label: "VALOR CUOTA", value: `C$${prestamo.valor_cuota.toFixed(2)}` },
    { label: "SALDO PENDIENTE", value: `C$${prestamo.saldo_pendiente.toFixed(2)}`, highlight: true }
  ];

  const boxWidth = 40;
  const boxHeight = 18;
  const gap = 5;
  const startX = 20;
  const startY = 84;

  boxes.forEach((box, i) => {
    const x = startX + i * (boxWidth + gap);
    
    // Fondo
    doc.setFillColor(244, 244, 245); // Zinc 100
    doc.rect(x, startY, boxWidth, boxHeight, "F");
    
    // Borde sutil
    doc.setDrawColor(228, 228, 231); // Zinc 200
    doc.setLineWidth(0.2);
    doc.rect(x, startY, boxWidth, boxHeight, "S");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(115, 115, 115);
    doc.text(box.label, x + 3, startY + 5);

    // Value
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    if (box.highlight) {
      doc.setTextColor(185, 28, 28); // Rojo
    } else {
      doc.setTextColor(24, 24, 27);
    }
    doc.text(box.value, x + 3, startY + 12);
  });

  // 4. Tabla de Historial de Abonos
  doc.setTextColor(15, 118, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("HISTORIAL DE ABONOS", 20, 112);

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.4);
  doc.line(20, 114, 190, 114);

  // Cabecera Tabla
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(63, 63, 70);
  doc.text("Cuota #", 22, 120);
  doc.text("Fecha de Pago", 45, 120);
  doc.text("Capital", 100, 120, { align: "right" });
  doc.text("Interés", 135, 120, { align: "right" });
  doc.text("Total Abonado", 188, 120, { align: "right" });

  doc.setDrawColor(212, 212, 216); // Zinc 300
  doc.setLineWidth(0.2);
  doc.line(20, 122, 190, 122);

  let yRow = 128;
  const pageLimitY = 270;

  if (!prestamo.pagos || prestamo.pagos.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(161, 161, 170);
    doc.text("No se registran abonos en este crédito aún.", 105, 134, { align: "center" });
    yRow = 140;
  } else {
    // Clonar y ordenar cronológicamente
    const chronologicalPagos = [...prestamo.pagos].sort(
      (a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()
    );

    chronologicalPagos.forEach((pago, index) => {
      if (yRow > pageLimitY) {
        doc.addPage();
        yRow = 20;
        // Volver a dibujar cabeceras en nueva página
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(63, 63, 70);
        doc.text("Cuota #", 22, yRow);
        doc.text("Fecha de Pago", 45, yRow);
        doc.text("Capital", 100, yRow, { align: "right" });
        doc.text("Interés", 135, yRow, { align: "right" });
        doc.text("Total Abonado", 188, yRow, { align: "right" });
        doc.setDrawColor(212, 212, 216);
        doc.line(20, yRow + 2, 190, yRow + 2);
        yRow += 8;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      
      doc.text(`#${pago.numero_cuota || (index + 1)}`, 22, yRow);
      
      const fPago = new Date(pago.fecha_pago).toLocaleDateString("es-NI", {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.text(fPago, 45, yRow);
      doc.text(`C$${pago.capital_abonado.toFixed(2)}`, 100, yRow, { align: "right" });
      doc.text(`C$${pago.interes_pagado.toFixed(2)}`, 135, yRow, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text(`C$${pago.monto_pagado.toFixed(2)}`, 188, yRow, { align: "right" });

      // Línea de fila
      doc.setDrawColor(244, 244, 245);
      doc.line(20, yRow + 2.5, 190, yRow + 2.5);

      yRow += 7.5;
    });
  }

  // Fila de Totales
  if (prestamo.pagos && prestamo.pagos.length > 0) {
    if (yRow > pageLimitY - 15) {
      doc.addPage();
      yRow = 20;
    }

    const totalCapital = prestamo.pagos.reduce((sum, p) => sum + p.capital_abonado, 0);
    const totalInteres = prestamo.pagos.reduce((sum, p) => sum + p.interes_pagado, 0);
    const totalMonto = prestamo.pagos.reduce((sum, p) => sum + p.monto_pagado, 0);

    doc.setDrawColor(38, 38, 38);
    doc.setLineWidth(0.4);
    doc.line(20, yRow, 190, yRow);
    
    yRow += 5;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    
    doc.text("TOTAL ABONADO", 22, yRow);
    doc.text(`C$${totalCapital.toFixed(2)}`, 100, yRow, { align: "right" });
    doc.text(`C$${totalInteres.toFixed(2)}`, 135, yRow, { align: "right" });
    doc.text(`C$${totalMonto.toFixed(2)}`, 188, yRow, { align: "right" });
  }

  // Pie de página en todas las páginas (o solo la última)
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.2);
    doc.line(20, 282, 190, 282);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    
    const textoFooter = `PrestaFácil • Control Oficial de Pagos • Generado el ${new Date().toLocaleString("es-NI")}`;
    doc.text(textoFooter, 105, 287, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, 190, 287, { align: "right" });
  }

  return doc;
}

function PrestamoDetalleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useAuth();

  const { data: prestamo, isLoading: loading } = useQuery({
    queryKey: ["prestamo", id],
    enabled: !!id && !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestamos")
        .select(`
          *,
          clientes ( nombre, telefono ),
          pagos (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Sort payments by date descending
      if (data.pagos) {
        data.pagos.sort((a: Pago, b: Pago) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
      }
      return data as Prestamo;
    },
  });

  const handleShareWhatsApp = () => {
    if (!prestamo) return;
    
    let telefono = prestamo.clientes?.telefono || "";
    telefono = telefono.replace(/\D/g, "");
    
    if (telefono.length > 0) {
      if (!telefono.startsWith("505")) {
        telefono = "505" + telefono;
      }
    }
    
    if (!telefono) {
      toast.warning("El cliente no tiene un teléfono registrado");
      return;
    }
    
    const fechaInicio = new Date(prestamo.fecha_inicio).toLocaleDateString("es-NI");
    
    let historialTexto = "";
    if (prestamo.pagos && prestamo.pagos.length > 0) {
      const chronologicalPagos = [...prestamo.pagos].sort(
        (a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()
      );
      chronologicalPagos.forEach((pago, index) => {
        const fechaPago = new Date(pago.fecha_pago).toLocaleDateString("es-NI", {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        historialTexto += `• Cuota ${pago.numero_cuota || (index + 1)}: C$${pago.monto_pagado.toFixed(2)} (${fechaPago})\n`;
      });
    } else {
      historialTexto = "Sin abonos registrados aún.\n";
    }

    const mensaje = 
`*TARJETA DE CONTROL DE PAGOS* 📄
*PrestaFácil*

*CLIENTE:* ${prestamo.clientes?.nombre}
*TELÉFONO:* +${telefono}

*DETALLES DEL CRÉDITO:*
----------------------------------
• *Monto Préstamo:* C$${prestamo.monto.toFixed(2)}
• *Total a Pagar:* C$${prestamo.total_a_pagar.toFixed(2)}
• *Saldo Pendiente:* C$${prestamo.saldo_pendiente.toFixed(2)}
• *Cuotas Pagadas:* ${prestamo.cuotas_pagadas} de ${prestamo.numero_cuotas}
• *Valor de Cuota:* C$${prestamo.valor_cuota.toFixed(2)}
• *Tipo de Pago:* ${prestamo.tipo_pago.toUpperCase()}
• *Fecha de Inicio:* ${fechaInicio}
• *Estado:* ${prestamo.estado.toUpperCase()}

*HISTORIAL DE ABONOS:*
----------------------------------
${historialTexto}
----------------------------------
_Generado automáticamente desde PrestaFácil_`;

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const handleSharePDF = async () => {
    if (!prestamo) return;
    
    try {
      const doc = generatePDFDoc(prestamo);
      const safeClienteNombre = (prestamo.clientes?.nombre || "cliente")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `tarjeta_pagos_${safeClienteNombre}.pdf`;

      const { Capacitor } = await import("@capacitor/core");

      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");

        // Convertir PDF a Base64
        const dataUri = doc.output("datauristring");
        const pdfBase64 = dataUri.split(",")[1];
        
        // Guardar archivo temporal en la caché de la aplicación
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        // Compartir el archivo nativo
        await Share.share({
          title: 'Tarjeta de Control de Pagos',
          text: `Te comparto la Tarjeta de Control de Pagos de ${prestamo.clientes?.nombre}`,
          url: writeResult.uri,
        });
        toast.success("PDF compartido con éxito");
      } else {
        // Modo Web / PWA
        const pdfBlob = doc.output("blob");
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Tarjeta de Control de Pagos',
            text: `Te comparto la Tarjeta de Control de Pagos de ${prestamo.clientes?.nombre}`,
          });
          toast.success("PDF compartido con éxito");
        } else {
          doc.save(fileName);
          toast.success("PDF descargado en el dispositivo");
        }
      }
    } catch (error) {
      console.error("Error al compartir PDF:", error);
      toast.error("No se pudo compartir el PDF");
    }
  };

  const handlePrintPDF = async () => {
    if (!prestamo) return;
    
    try {
      const { Capacitor } = await import("@capacitor/core");
      
      if (Capacitor.isNativePlatform()) {
        toast.info("Generando vista previa del PDF...");
        await handleSharePDF();
      } else {
        window.print();
      }
    } catch (err) {
      console.error("Error al imprimir:", err);
      window.print();
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestamo || !session) return;

    const montoPago = parseFloat(paymentAmount);
    if (isNaN(montoPago) || montoPago <= 0 || montoPago > prestamo.saldo_pendiente) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Matemáticas Proporcionales
      // Si presté $1000 y el total a pagar era $1200, entonces el capital es (1000/1200) = 83.33% del pago
      const proporcionCapital = prestamo.monto / prestamo.total_a_pagar;
      
      const capitalAbonado = montoPago * proporcionCapital;
      const interesPagado = montoPago - capitalAbonado;
      
      const nuevoSaldo = prestamo.saldo_pendiente - montoPago;
      const nuevoCapitalRecuperado = prestamo.capital_recuperado + capitalAbonado;
      const nuevoInteresGanado = prestamo.interes_ganado + interesPagado;
      const nuevasCuotasPagadas = prestamo.cuotas_pagadas + 1;
      const nuevoEstado = nuevoSaldo <= 0.01 ? "pagado" : prestamo.estado;

      // 2. Insertar Pago
      const { error: pagoError } = await supabase.from("pagos").insert({
        user_id: session.id,
        prestamo_id: prestamo.id,
        monto_pagado: montoPago,
        capital_abonado: capitalAbonado,
        interes_pagado: interesPagado,
        numero_cuota: nuevasCuotasPagadas,
        metodo_pago: "efectivo"
      });

      if (pagoError) throw pagoError;

      // 3. Actualizar Préstamo
      const { error: prestamoError } = await supabase
        .from("prestamos")
        .update({
          saldo_pendiente: nuevoSaldo < 0 ? 0 : nuevoSaldo,
          cuotas_pagadas: nuevasCuotasPagadas,
          capital_recuperado: nuevoCapitalRecuperado,
          interes_ganado: nuevoInteresGanado,
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq("id", prestamo.id);

      if (prestamoError) throw prestamoError;

      // 4. Actualizar Capital Config
      const { data: configData } = await supabase
        .from("capital_config")
        .select("capital_disponible, capital_en_calle, ganancia_total, total_recuperado")
        .eq("user_id", session.id)
        .single();

      if (configData) {
        await supabase
          .from("capital_config")
          .update({
            capital_disponible: Number(configData.capital_disponible) + montoPago,
            capital_en_calle: Number(configData.capital_en_calle) - capitalAbonado,
            ganancia_total: Number(configData.ganancia_total) + interesPagado,
            total_recuperado: Number(configData.total_recuperado) + capitalAbonado
          })
          .eq("user_id", session.id);
      }

      toast.success(`Pago de $${montoPago} registrado`);
      setShowPaymentModal(false);
      setPaymentAmount("");
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["prestamo", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });

    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Ocurrió un error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-zinc-50 dark:bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    );
  }

  if (!prestamo) {
    return (
      <main className="flex-1 p-6 relative z-10 space-y-6">
        <header className="flex items-center gap-4 pt-2">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Préstamo no encontrado</h1>
        </header>
      </main>
    );
  }

  const progress = Math.min(100, Math.round(((prestamo.total_a_pagar - prestamo.saldo_pendiente) / prestamo.total_a_pagar) * 100));

  return (
    <>
      <style jsx global>{`
        @media print {
          body, html, main, #__next {
            background: white !important;
            background-color: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

      <main className="flex-1 p-6 relative z-10 space-y-6 pb-24 print:hidden">
      {/* Modal de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Registrar Pago</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">El saldo actual es de ${prestamo.saldo_pendiente.toFixed(2)}</p>
            
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1 mb-2 block">Monto a abonar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-zinc-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={prestamo.saldo_pendiente}
                    required
                    autoFocus
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-xl font-bold text-zinc-900 dark:text-white"
                    placeholder={prestamo.valor_cuota.toFixed(2)}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Procesando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shadow-sm dark:shadow-none">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Detalle de Préstamo</h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{prestamo.clientes?.nombre}</p>
        </div>
      </header>

      {/* Tarjeta de Resumen */}
      <section className="rounded-[2rem] bg-zinc-900 dark:bg-white/5 border border-zinc-800 dark:border-white/10 p-6 shadow-2xl relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-colors ${
          prestamo.estado === 'activo' ? 'bg-teal-500' :
          prestamo.estado === 'pagado' ? 'bg-blue-500' :
          prestamo.estado === 'cancelado' ? 'bg-red-500' : 'bg-orange-500'
        }`}></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              prestamo.estado === 'activo' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 
              prestamo.estado === 'cancelado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
              prestamo.estado === 'pagado' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
              'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}>
              <Activity size={12} />
              {prestamo.estado}
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Otorgado</span>
              <span className="text-xs font-medium text-zinc-300">{new Date(prestamo.fecha_inicio).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="mb-8">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Saldo Pendiente</span>
            <div className="text-5xl font-black text-white tracking-tighter">${prestamo.saldo_pendiente.toFixed(2)}</div>
          </div>

          {/* Barra de Progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-zinc-400">Progreso de pago</span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  prestamo.estado === 'activo' ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' :
                  prestamo.estado === 'pagado' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                  'bg-zinc-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex flex-col gap-3 print:hidden">
        {prestamo.estado === 'activo' && (
          <button 
            onClick={() => {
              setPaymentAmount(prestamo.valor_cuota.toString());
              setShowPaymentModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(20,184,166,0.3)]"
          >
            <Plus size={20} />
            <span>Registrar Pago (C${prestamo.valor_cuota.toFixed(2)})</span>
          </button>
        )}
        
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            <Share2 size={16} />
            <span className="text-[10px] sm:text-xs">Enviar Texto</span>
          </button>
          <button
            type="button"
            onClick={handleSharePDF}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            <FileText size={16} />
            <span className="text-[10px] sm:text-xs">Compartir PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            <Printer size={16} />
            <span className="text-[10px] sm:text-xs">Tarjeta PDF</span>
          </button>
        </div>
      </div>

      {/* Detalles Secundarios */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Préstamo Original</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">${prestamo.monto}</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total a Devolver</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">${prestamo.total_a_pagar}</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Interés</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{prestamo.porcentaje_interes}%</span>
        </div>
        <div className="p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Cuotas Pagadas</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{prestamo.cuotas_pagadas} de {prestamo.numero_cuotas}</span>
        </div>
      </div>

      {/* Historial de Pagos */}
      <section className="space-y-4 pt-2">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest pl-1">Historial de Pagos</h3>
        
        <div className="space-y-3">
          {!prestamo.pagos || prestamo.pagos.length === 0 ? (
            <div className="text-center py-8 rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 border-dashed">
              <Calendar size={24} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">Aún no hay pagos registrados.</p>
            </div>
          ) : (
            prestamo.pagos.map((pago) => (
              <div key={pago.id} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-500">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white block mb-0.5">Abono a Cuota</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {new Date(pago.fecha_pago).toLocaleString('es-ES', { 
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-teal-600 dark:text-teal-400">+${pago.monto_pagado.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>

    {/* Tarjeta de Control de Pagos (Solo para Impresión/PDF) */}
    <div className="hidden print:block bg-white text-black p-8 max-w-3xl mx-auto font-sans">
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-wider text-black">PrestaFácil</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">Tarjeta de Control de Pagos</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Información del Cliente</h3>
          <p className="text-base font-bold text-black">{prestamo.clientes?.nombre}</p>
          <p className="text-zinc-650">Teléfono: {prestamo.clientes?.telefono ? `+505 ${prestamo.clientes.telefono.replace(/\D/g, "").replace(/^505/, "")}` : "Sin registrar"}</p>
        </div>
        <div className="space-y-1 text-right text-black">
          <h3 className="font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Detalles del Crédito</h3>
          <p><span className="font-bold">ID Préstamo:</span> {prestamo.id.slice(0, 8).toUpperCase()}</p>
          <p><span className="font-bold">Fecha Inicio:</span> {new Date(prestamo.fecha_inicio).toLocaleDateString("es-NI")}</p>
          <p><span className="font-bold">Estado:</span> <span className="uppercase font-bold">{prestamo.estado}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4 bg-zinc-100 rounded-xl mb-8 text-center text-sm border border-zinc-300 text-black">
        <div>
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Monto Crédito</span>
          <span className="font-black text-sm">C${prestamo.monto.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Total a Pagar</span>
          <span className="font-black text-sm">C${prestamo.total_a_pagar.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Valor Cuota</span>
          <span className="font-black text-sm">C${prestamo.valor_cuota.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Saldo Pendiente</span>
          <span className="font-black text-sm text-red-650">C${prestamo.saldo_pendiente.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-300 pb-1.5">Historial de Abonos</h3>
        
        <table className="w-full text-left border-collapse text-xs text-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 font-bold">Cuota #</th>
              <th className="py-2 font-bold">Fecha de Pago</th>
              <th className="py-2 font-bold text-right">Interés</th>
              <th className="py-2 font-bold text-right">Capital</th>
              <th className="py-2 font-bold text-right">Total Abonado</th>
            </tr>
          </thead>
          <tbody>
            {!prestamo.pagos || prestamo.pagos.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-zinc-500 italic">No hay abonos registrados en este período.</td>
              </tr>
            ) : (
              [...prestamo.pagos]
                .sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime())
                .map((pago, idx) => (
                  <tr key={pago.id} className="border-b border-zinc-200">
                    <td className="py-2.5 font-bold">#{pago.numero_cuota || (idx + 1)}</td>
                    <td className="py-2.5">
                      {new Date(pago.fecha_pago).toLocaleDateString("es-NI", {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 text-right text-zinc-500">C${pago.interes_pagado.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-zinc-500">C${pago.capital_abonado.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-black">C${pago.monto_pagado.toFixed(2)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-12 text-center text-[10px] text-zinc-400 border-t border-zinc-200 pt-4">
        PrestaFácil • Generado automáticamente como Tarjeta de Control de Pagos oficial.
      </div>
    </div>
    </>
  );
}

export default function PrestamoDetallePage() {
  return (
    <Suspense fallback={
      <main className="flex-1 p-6 flex justify-center items-center h-screen bg-zinc-50 dark:bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
      </main>
    }>
      <PrestamoDetalleContent />
    </Suspense>
  );
}
