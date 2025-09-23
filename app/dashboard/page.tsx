"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Filter, Calendar, MapPin, TrendingUp, Users, DollarSign } from "lucide-react"
import { ClaimDrawer } from "@/components/claim-drawer"

const mockClaims = [
  {
    id: "CLM-102938",
    policyId: "POL-88",
    amount: 12450.00,
    riskScore: 0.83,
    status: "New",
    lastUpdated: "2025-09-18T10:12:00Z",
    reasons: ["bank_reuse=5", "delay=37d", "address_degree=7"]
  },
  {
    id: "CLM-102939",
    policyId: "POL-89",
    amount: 8750.00,
    riskScore: 0.76,
    status: "Review",
    lastUpdated: "2025-09-18T09:30:00Z",
    reasons: ["velocity=4", "amount_threshold"]
  },
  {
    id: "CLM-102940",
    policyId: "POL-90",
    amount: 15200.00,
    riskScore: 0.92,
    status: "New",
    lastUpdated: "2025-09-18T08:45:00Z",
    reasons: ["device_reuse=3", "delay=45d", "bank_reuse=7"]
  },
  {
    id: "CLM-102941",
    policyId: "POL-91",
    amount: 5300.00,
    riskScore: 0.68,
    status: "Approved",
    lastUpdated: "2025-09-17T16:20:00Z",
    reasons: ["address_degree=4"]
  },
  {
    id: "CLM-102942",
    policyId: "POL-92",
    amount: 22100.00,
    riskScore: 0.89,
    status: "Escalated",
    lastUpdated: "2025-09-17T14:10:00Z",
    reasons: ["bank_reuse=8", "velocity=5", "amount_spike"]
  }
]

const riskDistributionData = [
  { range: "0.0-0.2", count: 145 },
  { range: "0.2-0.4", count: 234 },
  { range: "0.4-0.6", count: 189 },
  { range: "0.6-0.8", count: 87 },
  { range: "0.8-1.0", count: 23 }
]

const alertsOverTimeData = [
  { date: "Sep 12", alerts: 12 },
  { date: "Sep 13", alerts: 8 },
  { date: "Sep 14", alerts: 15 },
  { date: "Sep 15", alerts: 23 },
  { date: "Sep 16", alerts: 18 },
  { date: "Sep 17", alerts: 27 },
  { date: "Sep 18", alerts: 31 }
]

export default function Dashboard() {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null)
  const [minRisk, setMinRisk] = useState([0.7])
  const [product, setProduct] = useState<string>("all")
  const [region, setRegion] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredClaims = mockClaims.filter(claim =>
    claim.riskScore >= minRisk[0] &&
    (product === "all" || true) && // Mock filter
    (region === "all" || true) // Mock filter
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Use a consistent format that doesn't depend on locale/timezone
    const day = date.getUTCDate().toString().padStart(2, '0')
    const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
    const year = date.getUTCFullYear()
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')

    return `${day} ${month} ${year}, ${hours}:${minutes}`
  }

  const getRiskBadgeColor = (score: number) => {
    if (score >= 0.8) return "destructive"
    if (score >= 0.6) return "default"
    return "secondary"
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "New": return "default"
      case "Review": return "secondary"
      case "Approved": return "outline"
      case "Escalated": return "destructive"
      default: return "default"
    }
  }

  const totalFlagged = filteredClaims.length
  const avgRisk = filteredClaims.reduce((sum, claim) => sum + claim.riskScore, 0) / filteredClaims.length
  const alertsThisWeek = 127

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">SIU Command Center</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Region
              </label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="midlands">Midlands</SelectItem>
                  <SelectItem value="north">North</SelectItem>
                  <SelectItem value="south">South</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Min Risk Score: {minRisk[0].toFixed(1)}
              </label>
              <Slider
                value={minRisk}
                onValueChange={setMinRisk}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFlagged}</div>
            <p className="text-xs text-muted-foreground">
              Claims above risk threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRisk.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average across filtered claims
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts This Week</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Score Distribution</CardTitle>
            <CardDescription>
              Distribution of risk scores across all claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts Over Time</CardTitle>
            <CardDescription>
              Daily alert trends for the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={alertsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="alerts" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Claims</CardTitle>
          <CardDescription>
            Claims flagged for potential fraud ({filteredClaims.length} results)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Policy ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow
                  key={claim.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedClaim(claim.id)}
                >
                  <TableCell className="font-medium">{claim.id}</TableCell>
                  <TableCell>{claim.policyId}</TableCell>
                  <TableCell>{formatCurrency(claim.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeColor(claim.riskScore)}>
                      {claim.riskScore.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell suppressHydrationWarning>{formatDate(claim.lastUpdated)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedClaim(claim.id)
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Claim Drawer */}
      <ClaimDrawer
        claimId={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        claim={selectedClaim ? mockClaims.find(c => c.id === selectedClaim) || null : null}
      />
    </div>
  )
}