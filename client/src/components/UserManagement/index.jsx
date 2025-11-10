import React, { useEffect, useState, useCallback } from "react";
import { Table, Spin, Alert, Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { instance } from "../../contexts/Axios";
import { apis } from "../../constants/apis";

const { Title } = Typography;

const UserManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const navigate = useNavigate();

	/* ────────────────────────────────
	   Lấy danh sách tất cả User
	────────────────────────────────── */
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await instance.get(apis.users.getAll());
			setUsers(res.data);
		} catch (err) {
			setError(
				err.response?.data?.detail ||
					err.message ||
					"An error occurred while fetching users."
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	/* ────────────────────────────────
	   Xem thống kê 1 user
	────────────────────────────────── */
	const handleViewStats = (id) => {
		navigate(`/admin/users/${id}/stats`);
	};

	/* ────────────────────────────────
	   Xoá (soft‑delete) user
	────────────────────────────────── */
	const handleDelete = async (id) => {
		if (!window.confirm("Xác nhận xoá user?")) return;
		try {
			await instance.delete(apis.users.delete(id));
			fetchUsers(); // refresh list
		} catch (err) {
			alert("Không xoá được user!");
		}
	};

	/* ────────────────────────────────
	   Cột hiển thị
	────────────────────────────────── */
	const columns = [
		{ title: "ID", dataIndex: "id", key: "id" },
		{ title: "Name", dataIndex: "name", key: "name" },
		{ title: "Email", dataIndex: "email", key: "email" },
		{
			title: "Actions",
			key: "actions",
			render: (_, record) => (
				<span>
					{/* <Button size='small' onClick={() => handleViewStats(record.id)}>
						Stats
					</Button> */}
					<Button
						size='small'
						danger
						style={{ marginLeft: 8 }}
						onClick={() => handleDelete(record.id)}>
						Delete
					</Button>
				</span>
			),
		},
	];

	return (
		<div>
			<Title level={2}>User Management</Title>

			{error && (
				<Alert
					message='Error'
					description={error}
					type='error'
					showIcon
					closable
					style={{ marginBottom: 16 }}
				/>
			)}

			<Spin spinning={loading}>
				<Table
					dataSource={users}
					columns={columns}
					rowKey='id'
					pagination={{ pageSize: 10 }}
					scroll={{ x: "max-content" }}
				/>
			</Spin>
		</div>
	);
};

export default UserManagement;
