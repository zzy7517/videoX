import React, { useEffect, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { fetchWithAuth } from '@/lib/utils';

interface TextEditorProps {
    onTextChange?: (text: string) => void;
}

/**
 * 文本编辑器组件
 * 提供文本编辑、保存、加载和清空功能
 */
const TextEditor: React.FC<TextEditorProps> = ({ onTextChange }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const API_BASE_URL = '/api';  // 使用Next.js代理，而不是直接访问后端

    // 加载文本内容
    const loadContent = async () => {
        setError('');
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/text/`);
            if (response.ok) {
                const data = await response.json();
                const newContent = data.content || '';
                setContent(newContent);
                onTextChange?.(newContent);
            } else {
                throw new Error('加载失败');
            }
        } catch (error) {
            console.error('加载文本内容失败:', error);
            setError('加载失败，请刷新页面重试');
        } finally {
            setLoading(false);
        }
    };

    // 保存文本内容
    const saveContent = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/text/`, {
                method: 'PUT',
                body: JSON.stringify({ content }),
            });
            if (!response.ok) {
                throw new Error('保存失败');
            }
        } catch (error) {
            console.error('保存文本内容失败:', error);
            setError('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    // 处理文本变化
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        onTextChange?.(newContent);
    };

    // 组件加载时获取内容
    useEffect(() => {
        loadContent();
    }, []);

    // 自动保存功能（可选，这里设置为内容变化后1秒自动保存）
    useEffect(() => {
        if (!loading && content !== '') {
            const timer = setTimeout(() => {
                saveContent();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [content, loading]);

    if (loading) {
        return <div className="text-center py-4">加载中...</div>;
    }

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>文本编辑器</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <Textarea
                        value={content}
                        onChange={handleContentChange}
                        placeholder="请输入文本内容..."
                        className="min-h-[200px]"
                    />
                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button
                            onClick={saveContent}
                            disabled={saving}
                        >
                            {saving ? '保存中...' : '保存'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TextEditor; 