"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Calendar, CreditCard, FileText, MapPin, Phone, User, Zap, Shield, Eye } from "lucide-react"

interface ClaimData {
  id: string
  policyId: string
  amount: number
  riskScore: number
  status: string
  lastUpdated: string
  reasons: string[]
}

interface ClaimDrawerProps {
  claimId: string | null
  isOpen: boolean
  onClose: () => void
  claim: ClaimData | null
}

export function ClaimDrawer({ claimId, isOpen, onClose, claim }: ClaimDrawerProps) {
  if (!claim) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRiskLevel = (score: number) => {
    if (score >= 0.8) return { level: "High", color: "destructive" }
    if (score >= 0.6) return { level: "Medium", color: "default" }
    return { level: "Low", color: "secondary" }
  }

  const getRecommendation = (score: number) => {
    if (score >= 0.8) return "Escalate to SIU; hold payments"
    if (score >= 0.6) return "Request additional documentation"
    return "Standard processing"
  }

  const riskInfo = getRiskLevel(claim.riskScore)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claim Details
          </SheetTitle>
          <SheetDescription>
            Detailed analysis and evidence for claim {claim.id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Claim Meta & Risk Score */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{claim.id}</CardTitle>
                <Badge variant={riskInfo.color as any} className="text-sm">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {riskInfo.level} Risk
                </Badge>
              </div>
              <CardDescription>Policy: {claim.policyId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claim Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(claim.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                  <p className="text-lg font-semibold">{claim.riskScore.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="outline" className="mt-1">
                  {claim.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(claim.lastUpdated)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {getRecommendation(claim.riskScore)}
              </p>
            </CardContent>
          </Card>

          {/* Fraud Indicators */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Fraud Indicators
              </CardTitle>
              <CardDescription>
                Reasons this claim was flagged
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {claim.reasons.map((reason, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Bank Account Reuse</p>
                    <p className="text-muted-foreground">Same bank account used across 5 claims in 30 days</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Late Reporting</p>
                    <p className="text-muted-foreground">Claim reported 37 days after incident (threshold: 30 days)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Address Network</p>
                    <p className="text-muted-foreground">Address linked to 4 distinct claimants</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Evidence Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Bank Connections</p>
                  <p className="text-lg font-semibold">5</p>
                  <p className="text-xs text-muted-foreground">Related claims</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Address Degree</p>
                  <p className="text-lg font-semibold">7</p>
                  <p className="text-xs text-muted-foreground">Network size</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Device Links</p>
                  <p className="text-lg font-semibold">3</p>
                  <p className="text-xs text-muted-foreground">Shared devices</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Velocity</p>
                  <p className="text-lg font-semibold">4</p>
                  <p className="text-xs text-muted-foreground">Claims/14 days</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Document Placeholders</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• FNOL Report - Submitted 2025-09-18</p>
                  <p>• Police Report - Pending</p>
                  <p>• Damage Assessment - In Progress</p>
                  <p>• Witness Statements - None</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Escalate to SIU
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Request Documents
              </Button>
              <Button className="w-full" variant="outline">
                <User className="h-4 w-4 mr-2" />
                Approve Claim
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}