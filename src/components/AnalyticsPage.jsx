import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Building, Users, MapPin, TrendingUp, Download } from 'lucide-react';
import data from '../assets/data.json';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function AnalyticsPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedBuildingType, setSelectedBuildingType] = useState('all');

  // Process data for analytics
  const analytics = useMemo(() => {
    let filteredData = data;

    if (selectedDistrict !== 'all') {
      filteredData = filteredData.filter(bc => bc.district === selectedDistrict);
    }

    if (selectedBuildingType !== 'all') {
      filteredData = filteredData.filter(bc => bc.building_purpose === selectedBuildingType);
    }

    // Basic statistics
    const totalBusinessCenters = filteredData.length;
    const totalCompanies = filteredData.reduce((sum, bc) => sum + bc.companies.length, 0);
    const ktClients = filteredData.reduce((sum, bc) => 
      sum + bc.companies.filter(company => company.is_kt_client).length, 0
    );
    const totalRevenue = filteredData.reduce((sum, bc) => 
      sum + bc.companies.reduce((companySum, company) => companySum + (company.accruals || 0), 0), 0
    );

    // District distribution
    const districtStats = {};
    filteredData.forEach(bc => {
      if (!districtStats[bc.district]) {
        districtStats[bc.district] = { 
          businessCenters: 0, 
          companies: 0, 
          ktClients: 0,
          revenue: 0
        };
      }
      districtStats[bc.district].businessCenters++;
      districtStats[bc.district].companies += bc.companies.length;
      districtStats[bc.district].ktClients += bc.companies.filter(c => c.is_kt_client).length;
      districtStats[bc.district].revenue += bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0);
    });

    const districtData = Object.entries(districtStats).map(([district, stats]) => ({
      district,
      ...stats
    }));

    // Building type distribution
    const buildingTypeStats = {};
    filteredData.forEach(bc => {
      if (!buildingTypeStats[bc.building_purpose]) {
        buildingTypeStats[bc.building_purpose] = { 
          count: 0, 
          companies: 0,
          ktClients: 0
        };
      }
      buildingTypeStats[bc.building_purpose].count++;
      buildingTypeStats[bc.building_purpose].companies += bc.companies.length;
      buildingTypeStats[bc.building_purpose].ktClients += bc.companies.filter(c => c.is_kt_client).length;
    });

    const buildingTypeData = Object.entries(buildingTypeStats).map(([type, stats]) => ({
      type,
      ...stats
    }));

    // Top business centers by companies
    const topBusinessCenters = filteredData
      .map(bc => ({
        name: bc.business_center_name,
        companies: bc.companies.length,
        ktClients: bc.companies.filter(c => c.is_kt_client).length,
        revenue: bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0)
      }))
      .sort((a, b) => b.companies - a.companies)
      .slice(0, 10);

    // Top KT clients by revenue
    const allKtClients = [];
    filteredData.forEach(bc => {
      bc.companies.forEach(company => {
        if (company.is_kt_client) {
          allKtClients.push({
            name: company.organization_name,
            revenue: company.accruals || 0,
            services: company.services.length,
            businessCenter: bc.business_center_name
          });
        }
      });
    });

    const topKtClients = allKtClients
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalBusinessCenters,
      totalCompanies,
      ktClients,
      totalRevenue,
      districtData,
      buildingTypeData,
      topBusinessCenters,
      topKtClients
    };
  }, [selectedDistrict, selectedBuildingType]);

  // Get unique districts and building types for filters
  const districts = [...new Set(data.map(bc => bc.district))];
  const buildingTypes = [...new Set(data.map(bc => bc.building_purpose))];

  const exportData = () => {
    const csvContent = [
      ['Бизнес-центр', 'Район', 'Назначение', 'Компаний', 'КТ клиентов', 'Доходы'],
      ...data.map(bc => [
        bc.business_center_name,
        bc.district,
        bc.building_purpose,
        bc.companies.length,
        bc.companies.filter(c => c.is_kt_client).length,
        bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'business_centers_analytics.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Аналитика Бизнес-Центров Астаны
          </h1>
          <p className="text-gray-600">
            Детальная статистика по бизнес-центрам, компаниям и клиентам Казахтелеком
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Выберите район" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все районы</SelectItem>
              {districts.map(district => (
                <SelectItem key={district} value={district}>{district}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBuildingType} onValueChange={setSelectedBuildingType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Тип здания" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {buildingTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportData} variant="outline" className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Бизнес-центров</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBusinessCenters}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Компаний</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">КТ клиентов</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.ktClients}</div>
              <p className="text-xs text-muted-foreground">
                {((analytics.ktClients / analytics.totalCompanies) * 100).toFixed(1)}% от общего числа
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общие доходы</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRevenue.toLocaleString()} тг</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* District Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Распределение по районам</CardTitle>
              <CardDescription>Количество бизнес-центров и компаний по районам</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.districtData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="district" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="businessCenters" fill="#8884d8" name="БЦ" />
                  <Bar dataKey="companies" fill="#82ca9d" name="Компании" />
                  <Bar dataKey="ktClients" fill="#ffc658" name="КТ клиенты" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Building Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Типы зданий</CardTitle>
              <CardDescription>Распределение по назначению зданий</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.buildingTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => `${type}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.buildingTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Business Centers */}
          <Card>
            <CardHeader>
              <CardTitle>Топ бизнес-центров</CardTitle>
              <CardDescription>По количеству компаний</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topBusinessCenters.map((bc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{bc.name}</div>
                      <div className="text-sm text-gray-600">
                        {bc.companies} компаний • {bc.ktClients} КТ клиентов
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {bc.revenue.toLocaleString()} тг
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top KT Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Топ КТ клиентов</CardTitle>
              <CardDescription>По размеру доходов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topKtClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-600">
                        {client.businessCenter} • {client.services} услуг
                      </div>
                    </div>
                    <Badge variant="default" className="bg-blue-600">
                      {client.revenue.toLocaleString()} тг
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;

